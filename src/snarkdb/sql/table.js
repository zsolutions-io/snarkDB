import { zip, diff, get_duplicates, inter } from "utils/index.js";
import { Program, is_valid_address } from "aleo/index.js";
import {
  execute_offline,
} from 'aleo/proof.js';
import {
  empty_struct_data,
  random_struct_data,
  get_commit_data_from_id,
  save_commit_row,
  save_commit_data_from_id,
  get_commit_rows,
  get_commit_row,
} from "snarkdb/db/commit.js";
import { get_table_dir, get_public_table_dir, get_table_commits_dir } from "snarkdb/db/index.js";
import { save_object } from "utils/index.js";
import { get_datasource } from "datasources/index.js";
import { get_table_commit_dir, } from "snarkdb/db/index.js";
import crypto from "crypto";
import { table_insert_function } from "./insert.js";
import { random_from_type, } from 'aleo/types/index.js';
import { hash_str } from "aleo/proof.js";

import {
  encrypt_for_anyof_addresses_to_file,
  decrypt_file_from_anyof_address
} from 'aleo/encryption.js';

import fs from "fs/promises";

import {
  Address,
} from '@aleohq/sdk';


export class Table {
  constructor(
    database_name,
    table_name,
    program,
    allowed_adresses,
    capacity,
    sync_period,
    source,
    definition_columns,
    view_key,
    snarkdb_version,
    as = null,
    is_view = false
  ) {
    this.program = program;
    this.database = database_name;
    this.name = table_name;
    this.capacity = capacity;
    this.sync_period = sync_period;
    this.allowed_adresses = allowed_adresses;
    this.source = source;
    this.definition_columns = definition_columns;
    this.view_key = view_key;
    this.snarkdb_version = snarkdb_version;
    this.ref = as || table_name;
    this.is_view = is_view;
  }

  get description_struct() {
    return table_description_struct(this.name, this.columns);
  }

  get dsk_struct() {
    return table_dsk_struct(this.name, this.columns);
  }

  get row_record() {
    return table_row_record(this.name);
  }

  get insert_function() {
    return table_insert_function(this.name);
  }

  get columns() {
    if (this.definition_columns) return this.definition_columns;
    for (const struct of this.program.structs) {
      if (struct.name === description_struct_name(this.name)) {
        return struct.fields.map(
          ({ name, type }) => ({
            snarkdb: {
              name,
              type
            }
          })
        );
      }
    }
    throw new Error(
      `Struct '${description_struct_name(this.name)}' `
      + `was not found in program source code.`
    );
  }

  async insert(query) {
    if (this.is_view)
      throw Error("Cannot insert into a view.");

    const row = query_to_insert_row(this.columns, query);
    const args = [row_to_record_string(row)];

    await this.program.call(this.insert_function.name, args);;
  }

  async save(overwrite) {
    const schema = empty_struct_data(this.description_struct);
    const description = {
      settings: {
        capacity: this.capacity,
        sync_period: this.sync_period,
      },
      source: {
        datasource: this.source.datasource_name,
        name: this.source.name,
      },
      columns: this.columns,
      allowed_addresses: this.allowed_adresses.map(
        (address) => address.to_string()
      ),
      view_key: this.view_key,
      snarkdb_version: this.snarkdb_version,
    };
    const table_definitions_dir = get_table_dir(this.database, this.name);
    await save_object(
      table_definitions_dir, definition_filename, description, !overwrite
    );

    await save_encrypted_schema(
      this.database, this.name, this.allowed_adresses, description.view_key, schema
    );
    return await this.program.save();
  }

  async sync() {
    const commit = await this.last_commit;
    if (
      commit != null
      && commit.timestamp + this.sync_period * 1000 > Date.now()
    ) {
      return;
    }
    await this.commit();
  }

  async commit() {
    const commit_temp_id = crypto.randomUUID().replace(/-/g, "");
    const rows = await this.save_rows(commit_temp_id);
    const row_amount = rows.size;
    const decoy_amount = this.capacity - row_amount;
    await this.save_decoys(commit_temp_id, decoy_amount);
    const csk = random_from_type("scalar");
    const {
      data_commit_id, dsk_commit_id
    } = await this.compute_commit_ids(commit_temp_id, csk);
    const commit_id = combine_commit_ids(data_commit_id, dsk_commit_id);
    await fs.rename(
      get_table_commit_dir(this.database, this.name, commit_temp_id),
      get_table_commit_dir(this.database, this.name, commit_id)
    );
    console.log(`Commit ${commit_id} created for table ${this.name}.`);

    const commit_data = {
      timestamp: Date.now(),
      row_amount,
      csk,
      data_commit_id,
      dsk_commit_id,
    }
    await save_commit_data_from_id(
      this.database, this.name, commit_id, commit_data
    );
  }

  async save_rows(commit_id) {
    const queryRunner = this.source.datasource.createQueryRunner();
    await queryRunner.connect();
    if (!/^[a-zA-Z0-9_]+$/.test(this.source.name)) {
      throw new Error("Invalid table name");
    }
    const sqlQuery = `SELECT * FROM ${this.source.name}`;
    const stream = await queryRunner.stream(sqlQuery);
    const row_adapter = columns_to_row_adapter(this.definition_columns);

    const rows = new Set();
    stream.on("data", (row) => {
      rows.add(
        this.save_row(commit_id, row_adapter(row), false)
      );
    });
    await new Promise((resolve, reject) => {
      stream.on("end", () => {
        resolve();
      });
      stream.on("error", (err) => {
        reject(err);
      });
    });

    await queryRunner.release();
    return rows;
  }

  async save_decoys(commit_id, amount) {
    const row = empty_struct_data(this.description_struct);
    await Promise.all(
      [...Array(amount)].map(
        (_) => this.save_row(
          commit_id,
          row,
          true
        )
      )
    )
  }

  async save_row(commit_id, data, decoy) {
    const row_id = crypto.randomUUID().replace(/-/g, "");
    const row_data = {
      data,
      decoy: Boolean(decoy),
      dsk: random_struct_data(this.dsk_struct),
    }
    await save_commit_row(this.database, this.name, commit_id, row_id, row_data);
    return row_id;
  }

  get last_commit() {
    return (async () => {
      const table_commits_dir = get_table_commits_dir(this.database, this.name);
      let commit_ids = null;
      try {
        commit_ids = await fs.readdir(table_commits_dir);
      } catch (e) {
        return null;
      }
      if (commit_ids.length === 0)
        return null;
      const commits = await Promise.all(
        commit_ids.map(
          async (commit_id) =>
            await get_commit_data_from_id(this.database, this.name, commit_id)
        )
      );
      const sorted_commits = commits.sort(
        (a, b) => b.timestamp - a.timestamp
      );
      return sorted_commits[0];
    })();
  }

  async close() {
    await this.source.datasource.destroy()
  }

  async compute_commit_ids(commit_id, csk) {
    const rows = await get_commit_rows(this.database, this.name, commit_id);
    let data_state = "0field";
    let dsk_state = "0field";

    for (const row_id of rows) {
      const row = await get_commit_row(this.database, this.name, commit_id, row_id);

      const inputs = [
        row.data,
        data_state,
        row.dsk,
        dsk_state,
      ];
      const { outputs } = await execute_offline(
        this.name,
        this.insert_function.name,
        inputs,
        false,
      );
      data_state = outputs[0];
      dsk_state = outputs[1];
    }
    const { outputs: [data_commit_id] } = await execute_offline(
      "utils",
      "commit_state",
      [data_state, csk],
      false,
    );
    const { outputs: [dsk_commit_id] } = await execute_offline(
      "utils",
      "commit_state",
      [dsk_state, csk],
      false,
    );

    return { data_commit_id, dsk_commit_id };
  }
}


Table.from_parsed_table = async function ({
  db,
  table,
  as,
}) {
  const database = database_from_attribute(db);
  const schema = await read_access(table, database);
  const columns = empty_struct_to_columns(schema);
  return new Table.from_columns(
    database,
    table,
    columns,
    null,
    null,
    null,
    null,
    null,
    null,
    as
  );
};


Table.from_columns = function (
  database_name,
  table_name,
  columns,
  allowed_adresses,
  capacity,
  sync_period,
  source,
  view_key,
  snarkdb_version,
  as,
  is_view
) {
  is_view = Boolean(is_view);
  const program = table_from_columns(table_name, columns, is_view);
  return new Table(
    database_name,
    table_name,
    program,
    allowed_adresses,
    capacity,
    sync_period,
    source,
    columns,
    view_key,
    snarkdb_version,
    as,
    is_view
  );
};


Table.from_definition = async function (
  database_name, table_name, definition
) {
  const allowed_addresses = definition.allowed_addresses.map(
    (address) => Address.from_string(address)
  );
  const datasource = await get_datasource(definition.source.datasource);
  const source = {
    datasource,
    name: definition.source.name,
    datasource_name: definition.source.datasource,
  };
  return Table.from_columns(
    database_name,
    table_name,
    definition.columns,
    allowed_addresses,
    definition.settings.capacity,
    definition.settings.sync_period,
    source,
    definition.view_key,
    definition.snarkdb_version
  );
};


Table.from_code = function (
  database_name, program_code
) {
  const program = Program.from_code(program_code);
  return new Table(
    database_name,
    program.name,
    program,
  );
};


export const combine_commit_ids = (data_commit_id, dsk_commit_id) => {
  const part1 = data_commit_id.replace(/\D/g, '');
  const part2 = dsk_commit_id.replace(/\D/g, '');

  return hash_str(`${part1}${part2}`);
}


export const dsk_struct_name = (table_name) => (
  `Dsk_${table_name}`
);


export const description_struct_name = (table_name) => (
  `Desc_${table_name}`
);


export const row_record_name = (table_name) => (
  `Row_${table_name}`
);


export const insert_function_name = (table_name) => (
  `insert_${table_name}`
);


const encrypted_schema_filename = "encrypted_schema";
const definition_filename = "definition";



const table_from_columns = (table_name, columns, is_view) => {
  return new Program(
    table_name,
    {
      imports: [],
      structs: table_structs(table_name, columns),
      records: table_records(table_name),
      mappings: [],
      closures: [],
      functions: table_functions(table_name, is_view),
    }
  );
}

const table_structs = (table_name, columns) => {
  return [
    table_description_struct(table_name, columns),
    table_dsk_struct(table_name, columns),
  ];
}


const table_description_struct = (table_name, columns) => {
  const struct_attributes = columns.map(column_to_attribute);

  return {
    name: description_struct_name(table_name),
    fields: struct_attributes,
  };
}


const table_dsk_struct = (table_name, columns) => {
  const struct_attributes = columns
    .map(column_to_attribute)
    .map(
      ({ name, type }) => ({
        name,
        type: {
          category: "integer",
          value: "field",
        },
      })
    );
  return {
    name: dsk_struct_name(table_name),
    fields: struct_attributes,
  };
}



const table_records = (table_name) => {
  return [table_row_record(table_name)];
}


const table_row_record = (table_name) => {
  return {
    name: row_record_name(table_name),
    fields: [
      {
        name: "owner",
        type: {
          category: "address",
          value: "address",
          visibility: "private",
        },
      },
      {
        name: "data",
        type: {
          category: "custom",
          value: description_struct_name(table_name),
          visibility: "private",
        },
      },
      {
        name: "decoy",
        type: {
          category: "boolean",
          value: "boolean",
          visibility: "private",
        },
      }
    ],
  }
}


const table_functions = (table_name, is_view) => {
  return is_view ? [] : [table_insert_function(table_name)];
}




const column_to_aleo_string = ({ name, value, aleo_type, ast_type }) => {
  if (ast_type === "number" && aleo_type.category === "integer")
    return `${value}${aleo_type.value}`;

  if (ast_type === "single_quote_string" && aleo_type.value === "address") {
    if (!is_valid_address(value))
      throw Error(`Invalid aleo address : '${value}'.`);
    return `${value}`;
  }

  if (ast_type === "bool" && aleo_type.value === "boolean") {
    return `${value}`;
  }

  throw Error(
    `Input type '${ast_type}' incompatible with aleo type `
    + `'${aleo_type.value}' for value '${value}'.`
  );
};


const row_to_record_string = (row) => {
  let record_acc = "";
  for (const column of row) {
    const aleo_string = column_to_aleo_string(column);
    record_acc += `${column.name}:${aleo_string},`;
  }
  if (record_acc.length === 0)
    throw Error("At least one row attribute necessary.");
  record_acc = record_acc.slice(0, record_acc.length - 1);
  return `{${record_acc}}`;
};


const database_from_attribute = (db_attribute) => {
  let database_name = global.context.account.address().to_string();
  if (db_attribute) {
    if (!is_valid_address(db_attribute))
      throw Error("Database should be a valid Aleo address.");
    database_name = db_attribute;
  }
  return database_name;
}


export const get_tables_from_parsed_tables = async (tables) => {
  const froms = []
  if (!tables?.length || tables?.length > 2) {
    throw Error(
      "Only one or two tables are supported for now."
    );
  }
  for (const parsed_from_table of tables) {
    if (parsed_from_table?.expr)
      throw Error(
        "Nested queries are not supported for now."
      );
    froms.push(
      await Table.from_parsed_table(parsed_from_table)
    );
  }
  return froms;
}

export const get_fields_from_parsed_columns = (query_columns, all_fields) => {
  let fields = [];
  for (const column of query_columns) {
    fields = fields.concat(get_fields_from_parsed_column(column, all_fields));
  }
  const duplicates = get_duplicates(
    fields.map((row) => `'${row.ref}'`)
  );
  if (duplicates.length > 0) {
    throw Error(
      `Ambigious selected columns: '${duplicates.join(", ")}'. `
      + `Use 'as' to rename them.`
    );
  }
  return fields;
}


export const get_all_fields = (tables) => {
  const fields = tables.reduce(
    (accumulated_fields, table) => accumulated_fields.concat(
      get_all_fields_from_table(table)
    ), []
  );
  const duplicates = get_duplicates(
    fields.map((row) => `'${row.ref}'`)
  );
  if (duplicates.length > 0) {
    throw Error(
      `Ambigious selected columns: '${duplicates.join(", ")}'. `
      + `Use 'as' to rename them.`
    );
  }
  return fields;
}


const get_all_fields_from_table = (table) => {
  return table.columns.map(
    (column) => ({
      ref: column.snarkdb.name,
      table,
      column: column
    })
  );
}


export const get_fields_from_parsed_column = (column, all_fields) => {
  if (column.expr.type === "aggr_func") {
    console.log(column.expr.args.expr);
    throw Error("Aggregate functions are not supported for now."); // TODO : implement aggregate functions
  }
  if (column.expr.type !== "column_ref")
    throw Error("Can only select column references for now."); // TODO : implement select expressions

  const concerned_fields = !column.expr.table ? all_fields : all_fields.filter(
    (field) => field.table.ref === column.expr.table
  );

  if (concerned_fields.length === 0)
    throw Error(`Table '${column.expr.table}' not found.`);

  const columns = concerned_fields
    .filter((field) => (
      column.expr.column === "*"
      || field.column.snarkdb.name === column.expr.column
    ))
    .map((field) => {
      field.ref = column.as || field.column.snarkdb.name;
      return field;
    });

  if (columns.length === 0 && column.expr.column !== "*")
    throw Error(`Column '${column.expr.column}' not found.`);

  return columns;
}


const column_to_attribute = (column) => {
  return {
    name: column.snarkdb.name,
    type: column.snarkdb.type,
  };
}


const query_to_insert_row = (table_columns, query) => {
  const query_attributes =
    zip([query.values[0].value, query.columns])
      .map(([attribute, name]) => ({
        ...attribute,
        name
      }));
  const row = query_attributes_to_insert_row(query_attributes, table_columns);
  throw_incompatible_row_columns(row, table_columns);
  return row;
}


const query_attributes_to_insert_row = (query_attributes, table_columns) => {
  const row = [];
  for (const column of query_attributes) {
    for (const { name, aleo_type } of table_columns) {
      if (name === column.name) {
        row.push({
          name,
          aleo_type,
          sql_type: null,
          value: column.value,
          ast_type: column.type,
        });
        break;
      }
    }
  }
  return row;
}

const throw_incompatible_row_columns = (row, columns) => {
  const expected_colnames = new Set(
    columns.map(
      ({ snarkdb }) => snarkdb.name
    )
  );
  const gotten_colnames = new Set(row.map((row) => row.name));

  const missings = ([...diff(expected_colnames, gotten_colnames)]).join(", ");
  if (missings.length > 0)
    throw Error(`Invalid insert query. Missing columns: (${missings})`);

  const extras = ([...diff(gotten_colnames, expected_colnames)]).join(", ");
  if (extras.length > 0)
    throw Error(`Invalid insert query. Extra columns: (${extras})`);
}


export const table_visibility_to_addresses = (visibility) => {
  visibility = (visibility === "public" || visibility === "") ?
    "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc" :
    visibility;
  const addresses = visibility.split(",");
  return addresses;
};


const save_encrypted_schema = async (
  database, tablename, addresses, view_key, schema
) => {
  const address = Address.from_string(database);
  const table_definitions_dir = get_public_table_dir(
    address.to_string(), tablename
  );

  await encrypt_for_anyof_addresses_to_file(
    address,
    schema,
    table_definitions_dir,
    encrypted_schema_filename,
    addresses,
    view_key,
  );
}



const read_access = async (tablename, database) => {
  const context_view_key = global.context.account.viewKey();
  const table_definitions_dir = get_public_table_dir(
    database, tablename
  );
  const enc_description_path = `${table_definitions_dir}/${encrypted_schema_filename}.json`;
  const schema = await decrypt_file_from_anyof_address(
    context_view_key,
    enc_description_path,
    database
  );
  return schema;
}


export async function get_table_definition(database, tablename) {
  const table_definitions_dir = get_table_dir(database, tablename);
  const definition_path = `${table_definitions_dir}/${definition_filename}.json`;
  const definition = JSON.parse(await fs.readFile(definition_path));
  return definition;
}


const columns_to_row_adapter = (columns) => {
  const typeorm_to_snarkdb = Object.fromEntries(
    columns.map(
      ({ snarkdb, typeorm }) => [
        typeorm.name,
        { key: snarkdb.name, type: snarkdb.type }
      ]
    )
  );
  return (row) => {
    const filtered_row = {};
    for (const [column, value] of Object.entries(row)) {
      const snarkdb_adapter = typeorm_to_snarkdb?.[column];
      if (snarkdb_adapter != null) {
        filtered_row[snarkdb_adapter.key] = value_to_snarkdb(value, snarkdb_adapter.type);
      }
    }
    const filtered_row_str = `{`
      + Object.entries(filtered_row)
        .map(
          ([column, value]) => `${column}:${value}`
        )
        .join(',')
      + `}`;
    return filtered_row_str;
  };
}


const value_to_snarkdb = (value, type) => {
  if (type.category === "integer")
    return `${parseInt(value)}${type.value}`;

  if (type.category === "boolean") {
    return `${Boolean(value)}`;
  }

  throw Error(
    `Unsupported type : '${type.value}'.`
  );
}


const empty_struct_to_columns = (schema) => {
  const columns =
    schema
      .replace(/\s/g, "")
      .replace(/\{/g, "")
      .replace(/\}/g, "")
      .split(",")
      .map((element) => {
        const [name, value] = element.split(":");
        return {
          snarkdb: {
            name: name.replace(/\s/g, ""),
            type: snarkdb_value_to_type(value.replace(/\s/g, ""))
          }
        }
      })
  return columns;
}


const snarkdb_value_to_type = (value) => {
  if ((["true", "false"]).includes(value))
    return {
      category: "boolean",
      value: "boolean",
    };

  const intPattern = /(\-*\d+)(i|u)(\d+)/;
  const matches_int = value.match(intPattern);
  if (matches_int) {
    const [, number1, type, number2] = matches_int;
    return {
      category: "integer",
      value: `${type}${number2}`,
    };
  }
  if (value.endsWith("field"))
    return {
      category: "integer",
      value: "feild",
    }
  if (value.endsWith("group"))
    return {
      category: "integer",
      value: "group",
    }
  if (value.endsWith("scalar"))
    return {
      category: "scalar",
      value: "group",
    }

  throw Error(`Unsupported type : '${value}'.`);
}