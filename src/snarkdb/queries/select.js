import { bech32m } from "bech32";
import crypto from 'crypto'

import { hexToBytes, save_object } from "utils/index.js";
import {
  get_tables_from_parsed_tables,
  get_fields_from_parsed_columns,
  get_all_fields,
} from "../sql/table.js";
import { network_get_records } from "../../aleo/network.js";
import { Table } from "../sql/table.js";
import { VariableManager } from "aleo/program.js";
import { null_value_from_type, random_from_type } from "aleo/types/index.js";
import { encode_string_to_fields } from "aleo/types/custom_string.js";

import { get_query_dir } from "snarkdb/db/index.js";
import { encrypt_for_anyof_addresses_to_file } from "aleo/encryption.js";
import {
  Address,
} from '@aleohq/sdk';
import NodeSQLParser from "node-sql-parser";

export const execute_select_query = async (query) => {
  const {
    froms,
    fields,
    where,
    all_owned,
    aggregates,
  } = await load_select_query(query);
  const parser = new NodeSQLParser.Parser();
  const sql = parser.sqlify(query);
  console.log("Executing query:");
  console.log(sql);
  if (all_owned)
    return await execute_select_query_owned(query, froms, fields, where);

  const query_id = random_variable_name();
  const table = select_query_to_table(
    global.context.account.address().to_string(), query_id, froms, fields, where, aggregates
  );
  const query_program_code = table.program.code;
  console.log(query_program_code);

  await save_query(query_id, String(sql), froms,);
  // const program = await deploy_program(code);
  // console.log(query.from[1].on);
}

export const load_select_query = async (query) => {
  const froms = await get_tables_from_parsed_tables(query?.from);
  const all_fields = get_all_fields(froms);
  const {
    fields, relevant_fields
  } = get_fields_from_parsed_columns(query.columns, all_fields);
  const where = parse_where_expression(query.where, froms, fields, all_fields);
  const aggregates = [];
  console.log(fields)
  //get_aggregates_from_parsed_columns(fields);
  //console.log({ where: where.right.value[2] });
  const all_owned = relevant_fields.every(
    ({ table }) => (
      table.database === global.context.account.address().to_string()
    )
  );
  return {
    froms,
    fields,
    where,
    all_owned,
    aggregates,
  };
}


const save_query = async (query_id, sql_string, froms,) => {
  const view_key = random_from_type("scalar");
  const query_hash = crypto.createHash('sha256').update(sql_string).digest('hex');
  const origin_account = global.context.account;
  const origin = origin_account.address().to_string();
  const query = {
    query_id: query_id,
    sql: sql_string,
    origin,
    hash: query_hash,
    view_key,
  };
  const private_query_dir = get_query_dir(origin, query_hash);
  await save_object(
    private_query_dir,
    "description",
    query,
    true,
  );
  await save_query_public_data(origin_account, query_id, sql_string, froms, view_key);
}

const total_addresses_amount = 10;
export const encrypted_query_filename = "encrypted_query";

const save_query_public_data = async (
  origin_account, query_id, sql_string, froms, view_key
) => {
  const query_as_fields = encode_string_to_fields(sql_string);
  const encoded_query = `[${query_as_fields.join(',')}]`;

  const query_id_as_fields = encode_string_to_fields(query_id, 1);
  const signature = origin_account.sign(
    new TextEncoder(
      "utf-8"
    ).encode(sql_string)
  ).to_string();
  const origin_address = origin_account.address().to_string();
  const to_encrypt = `{
    id: ${query_id_as_fields[0]},
    sql: ${encoded_query},
    sig: ${signature},
    origin: ${origin_address}
  }`;

  const public_query_dir = get_query_dir(origin_address, query_id, true);
  const context_address = global.context.account.address();

  const enc_addresses = [...
    new Set(
      froms
        .map((from) => from.database)
        .concat([context_address.to_string()])
    )
  ];

  const decoys = total_addresses_amount - enc_addresses.length;
  if (decoys < 0) {
    throw new Error(`Too many addresses in the request: ${enc_addresses.length}.`);
  }
  const addresses =
    enc_addresses
      .concat(
        [...new Array(decoys)].map(_ => random_from_type("address"))
      )
      .map((db) => Address.from_string(db));
  const signer = Address.from_string(random_from_type("address"));

  await encrypt_for_anyof_addresses_to_file(
    signer,
    to_encrypt,
    public_query_dir,
    encrypted_query_filename,
    addresses,
    view_key,
  );
}


export const execute_select_query_owned = async (
  query, froms, fields, where
) => {
  console.log("No need for a snark for this query, all tables are owned by context account.");
  return;
}


export const select_query_to_table = (origin, query_id, froms, fields, where, aggregates) => {
  const table_name = query_id;
  console.log(fields);
  const columns = fields.map(({ column, ref }) => ({
    ...column,
    attribute: ref,
  }));
  const table = Table.from_columns(
    origin,
    table_name,
    columns,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
  );

  table.program.imports.push(...select_imports(table, froms));
  table.program.structs.push(...select_structs(table, froms, aggregates));
  table.program.records.push(...select_records(table, froms, aggregates));
  table.program.functions.push(
    ...select_functions(table, froms, fields, where)
  );

  return table;
}


const done_record_name = (table_name) => {
  return `Done_${table_name}`;
}

const aggregates_struct_name = (table_name) => {
  return `Aggr_${table_name}`;
}



const select_done_record = (table) => {
  return {
    name: done_record_name(table.name),
    fields: [
      {
        name: "owner",
        type: {
          category: "address",
          value: "address",
          visibility: "private",
        },
      },
    ],
  };
}



const select_records = (table, froms, aggregates) => {
  return [];
}


const select_structs = (table, froms, aggregates) => {
  const structs = froms.map((from) => from.description_struct)
  if (aggregates.length > 1) {
    structs.push({
      name: aggregates_struct_name(table.name),
      fields: aggregates.map(({ name, type }) => ({
        name,
        type,
      })),
    });
  }
  return structs;
}


const select_functions = (table, froms, fields, where) => {
  return [
    ...select_process_functions(table, froms, fields, where),
  ];
}


const select_imports = (table, froms) => {
  return froms.map(({ program }) => program);
}


const select_process_functions = (table, froms, fields, where) => {
  const process_function = (froms.length === 1) ?
    single_from_select_process_function :
    multiple_from_select_process_function;
  // TODO: implement multiple froms
  return froms.map(
    (from, index) => process_function(table, from, fields, index, where)
  )
}

export const proc_function_name = (table_name) => {
  return `proc_${table_name}`;
}

const single_from_select_process_function = (
  to, from, fields, index, where
) => {
  const vars = new VariableManager();
  const fct = {
    name: proc_function_name(to.name),
    inputs: [
      {
        name: vars.let("selected_table_record"),
        type: {
          category: "custom",
          value: from.row_record.name,
          visibility: "record",
          from_program: from.name
        },
      },
      {
        name: vars.let("csk"),
        type: {
          category: "integer",
          value: "scalar",
          visibility: "private",
        },
      },
      {
        name: vars.let("prev_data_state"),
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: vars.let("prev_csk"),
        type: {
          category: "integer",
          value: "scalar",
          visibility: "private",
        },
      },
      {
        name: vars.let("prev_data_commit"),
        type: {
          category: "integer",
          value: "field",
          visibility: "public",
        },
      },
      {
        name: vars.let("out_psk"),
        type: {
          category: "integer",
          value: "scalar",
          visibility: "private",
        },
      },
    ],
    body: [
      {
        opcode: "commit.bhp256",
        inputs: [
          {
            name: vars.get("prev_data_state"),
          },
          {
            name: vars.get("prev_csk"),
          }
        ],
        outputs: [{
          name: vars.let("actual_prev_data_commit"),
          type: {
            category: "integer",
            value: "field",
          },
        }],
      },
      {
        opcode: "assert.eq",
        inputs: [
          {
            name: vars.get("actual_prev_data_commit"),
          },
          {
            name: vars.get("prev_data_commit"),
          }
        ],
      },
      {
        opcode: "hash.bhp256",
        inputs: [
          {
            name: `${vars.get("selected_table_record")}.data`,
          },
        ],
        outputs: [{
          name: vars.let("selected_table_record_data_hash"),
          type: {
            category: "integer",
            value: "field",
          },
        }],
      },
      {
        opcode: "ternary",
        inputs: [
          {
            name: `${vars.get("selected_table_record")}.decoy`,
          },
          {
            name: `0field`,
          },
          {
            name: `${vars.get("selected_table_record_data_hash")}`,
          },
        ],
        outputs: [
          {
            name: vars.let("selected_table_record_data_state"),
          },
        ],
      },
      {
        opcode: "add",
        inputs: [
          {
            name: vars.get("prev_data_state"),
          },
          {
            name: vars.get("selected_table_record_data_state"),
          },
        ],
        outputs: [
          {
            name: vars.let("new_data_state"),
          },
        ],
      },
      {
        opcode: "commit.bhp256",
        inputs: [
          {
            name: vars.get("new_data_state"),
          },
          {
            name: vars.get("csk"),
          },
        ],
        outputs: [
          {
            name: vars.let("new_data_commit"),
            type: {
              category: "integer",
              value: "field",
            },
          },
        ],
      },
      ...get_single_select_instructions(vars, to, fields),
      ...get_single_from_where_instructions(vars, where),
      {
        opcode: "not",
        inputs: [
          {
            name: `${vars.get("selected_table_record")}.decoy`,
          }
        ],
        outputs: [
          {
            name: vars.let("is_not_decoy"),
          },
        ],
      },
      {
        opcode: "and",
        inputs: [
          {
            name: vars.get("is_not_decoy"),
          },
          {
            name: vars.get("where_result"),
          },
        ],
        outputs: [
          {
            name: vars.let("is_result_data_relevant"),
          },
        ],
      },
      {
        opcode: "not",
        inputs: [
          {
            name: vars.get("is_result_data_relevant"),
          },
        ],
        outputs: [
          {
            name: vars.let("is_result_data_not_relevant"),
          },
        ],
      },
      ...empty_irrelevant_data_instructions(vars, fields, to.description_struct.name),
      {
        opcode: "cast",
        inputs: [
          {
            name: to.database,
          },
          {
            name: vars.get("select_result_data"),
          },
          {
            name: vars.get("is_result_data_not_relevant"),
          },
          {
            name: vars.get("out_psk"),
          },
        ],
        outputs: [
          {
            name: vars.let("out_record"),
            type: {
              category: "custom",
              value: to.row_record.name,
              visibility: "record",
            },
          },
        ],
      },
      {
        opcode: "commit.bhp256",
        inputs: [
          {
            name: vars.get("select_result_data"),
          },
          {
            name: vars.get("out_psk"),
          },
        ],
        outputs: [
          {
            name: vars.let("new_process_commit"),
            type: {
              category: "integer",
              value: "field",
            },
          },
        ],
      },
    ],
    outputs: [
      {
        name: vars.get("new_data_state"),
        type: {
          category: "integer",
          value: "field",
          visibility: "private",
        },
      },
      {
        name: vars.get("new_data_commit"),
        type: {
          category: "integer",
          value: "field",
          visibility: "public",
        },
      },
      {
        name: vars.get("out_record"),
        type: {
          category: "custom",
          value: to.row_record.name,
          visibility: "record",
        },
      },
      {
        name: vars.get("new_process_commit"),
        type: {
          category: "integer",
          value: "field",
          visibility: "public",
        },
      },
    ],
  };

  if (from.is_view) {
    fct.body.push({
      opcode: "cast",
      inputs: [
        {
          name: `${vars.get("selected_table_record")}.data`,
        },
        {
          name: `${vars.get("selected_table_record")}.psk`,
        },
      ],
      outputs: [
        {
          name: vars.let("prev_process_commit"),
          type: {
            category: "integer",
            value: "field",
          },
        },
      ],
    });
    fct.outputs.push({
      name: vars.get("prev_process_commit"),
      type: {
        category: "integer",
        value: "field",
        visibility: "public",
      },
    });
  }
  return fct;
}


const select_filter_cast_inputs = (vars, fields) => {
  return fields.map(
    ({ column, ref }) => ({
      name: `${vars.get("selected_table_record")}.data.${column.snarkdb.name}`,
    })
  );
}


const empty_irrelevant_data_instructions = (vars, fields, description_struct_name) => {
  const instructions = fields.map(
    ({ column, ref }, i) => (
      {
        opcode: "ternary",
        inputs: [
          {
            name: vars.get("is_result_data_relevant"),
          },
          {
            name: `${vars.get("temp_select_result_data")}.${column.snarkdb.name}`,
          },
          {
            name: null_value_from_type(column.snarkdb.type),
          },
        ],
        outputs: [
          {
            name: vars.let(`select_result_data[${i}]`),
          },
        ],
      }
    )
  );

  instructions.push(
    {
      opcode: "cast",
      inputs: fields.map(
        ({ column, ref }, i) => (
          {
            name: vars.get(`select_result_data[${i}]`),
          }
        )
      ),
      outputs: [
        {
          name: vars.let(`select_result_data`),
          type: {
            category: "custom",
            value: description_struct_name,
          },
        },
      ],
    }
  );

  return instructions;
}


const random_variable_name = () => {
  const uuid = crypto.randomUUID().replaceAll('-', '');
  const to_encode = BigInt(`0x${uuid}`);
  const first_char_index = Number(to_encode % 26n);
  const first_char = String.fromCharCode(97 + first_char_index);
  const next_to_encode = to_encode / 26n;
  const rest_chars = next_to_encode
    .toString(36)
    .toLowerCase()
    .padStart(24, '0');
  return `${first_char}${rest_chars}`;
}


const parse_where_expression = (expression, froms, fields, all_fields) => {
  // types :      'select','column_ref','binary_expr','single_quote_string','expr_list','null','number','bool'
  // operators:   'AND', '=', 'IN', 'OR', 'IS NOT', '<>'
  if (expression?.type === "select") {
    throw new Error(
      `Select queries are not supported in where clauses yet.`
    );
  }
  if (expression?.type === "binary_expr") {
    expression.left = parse_where_expression(
      expression.left, froms, fields, all_fields
    );
    expression.right = parse_where_expression(
      expression.right, froms, fields, all_fields
    );
    return parse_binary_expr_expression(expression);
  }
  if (expression?.type === "column_ref") {
    return parse_column_ref_expression(
      expression, froms, fields, all_fields
    );
  }
  if (expression?.type === "expr_list") {
    for (const [index, element] of expression.value.entries()) {
      expression[index] = parse_where_expression(
        element, froms, fields, all_fields
      );
    }
  }
  return expression
}


const parse_column_ref_expression = (expression, froms, fields, all_fields) => {
  let corresponding_fields = expression?.table ? fields.filter(
    ({ table }) => table.ref === expression.table
  ) : all_fields;
  corresponding_fields = corresponding_fields.filter(
    ({ ref }) => ref === expression.column
  );
  if (corresponding_fields.length === 0)
    throw new Error(
      `Column ${expression.column} not found.`
    );
  if (corresponding_fields.length > 1)
    throw new Error(
      `Column ${expression.column} is ambiguous.`
    );
  expression.field = corresponding_fields[0];
  return expression;
}


const parse_binary_expr_expression = (expression) => {
  const { left, right, operator } = expression;
  return expression;
}


const get_single_select_instructions = (vars, to, fields) => {
  const instructions = [];
  const cast_inputs = [];

  let res_var_index = 0;
  for (const field of fields) {
    if (field.type === "column_ref") {
      cast_inputs.push({
        name: `${vars.get("selected_table_record")}.data.${field.column.snarkdb.name}`,
      });
    }
    else if (field.type === "number") {
      const val = field.value;
      if (!Number.isInteger(val)) {
        throw new Error(
          `Non integer numbers not supported yet.`
        );
      }
      cast_inputs.push({
        name: `${val}u128`,
      });
    }
    else if (field.type === "bool") {
      cast_inputs.push({
        name: `${field.value}`,
      });
    } // TODO: Function and expression
    else if (field.type === "binary_expr") {
      const res_var_name = `res_expr_${res_var_index}`
      const binary_expr_instructions = get_binary_expr_select_instructions(vars, field, res_var_index);
      if (binary_expr_instructions.length === 0) {
        throw new Error(
          `No instructions found for binary expression.`
        );
      }
      binary_expr_instructions.at(-1).output = vars.let(res_var_name);
      instructions.push(...binary_expr_instructions);
      cast_inputs.push({
        name: `${vars.get(res_var_name)}`,
      });
    }
    else if (field.type === "function") {
      throw new Error(
        `Functions not impletmented yet`
      );
    }
    res_var_index += 1;
  }

  instructions.push(
    {
      opcode: "cast",
      inputs: cast_inputs,
      outputs: [{
        name: vars.let("temp_select_result_data"),
        type: {
          category: "custom",
          value: to.description_struct.name,
        },
      }],
    },
  );
  return instructions;
}

const get_binary_expr_select_instructions = (vars, field, res_var_index) => {
  console.log({
    vars, field, res_var_index
  });
  return []
}

const get_single_from_where_instructions = (vars, where) => {
  if (where == null)
    return boolean_where_instructions(vars, true);
  if (where?.type === "bool")
    return boolean_where_instructions(vars, where.value);
  if (where?.type === "number")
    return boolean_where_instructions(vars, Number(where.value));
  if (where?.type === "binary_expr")
    return where_binary_expr_to_instructions(where);
  if (where?.type === "column_ref")
    return where_binary_expr_to_instructions(where);
  throw new Error(
    `Where clause type ${where.type} not supported.`
  );
}


const boolean_where_instructions = (vars, boolean) => {
  boolean = Boolean(boolean);
  return [
    {
      opcode: "is.eq",
      inputs: [
        {
          name: "true",
        },
        {
          name: `${boolean}`,
        },
      ],
      outputs: [
        {
          name: vars.let("where_result"),
        },
      ],
    }
  ];
}