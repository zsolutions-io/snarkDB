import { get_datasource } from "datasources/index.js";
import { Table, get_table_definition, table_visibility_to_addresses } from 'snarkdb/sql/table.js';
import { tables_dir } from "snarkdb/db/index.js";
import fs from "fs/promises";
import { package_version_as_integer, int_version_to_string } from "utils/strings.js";
import { random_from_type } from 'aleo/types/index.js';


export async function list_tables() {
  const database = global.context.account.address().to_string();
  const tables = await get_address_tables_names(database);
  if (tables.length === 0) {
    return console.log('No tables found.');
  }
  console.log(`Found ${tables.length} table(s):`);
  for (const identifier of tables) {
    console.log(`\n- ${identifier}`);
    const config = await get_table_definition(database, identifier);
    const display_config = {
      source: `${config.source.datasource}.${config.source.name}`,
      columns: config.columns.map((column) => {
        return `${column.typeorm.name}(${column.typeorm.type}): ${column.snarkdb.name}(${column.snarkdb.type.value})`;
      }),
      capacity: config.settings.capacity,
      snarkdb_version: int_version_to_string(config.snarkdb_version),
      visibility: allowed_addresses_to_visibility(config.allowed_addresses),
    }

    for (const [key, value] of Object.entries(display_config)) {
      let str_val = value;
      if (Array.isArray(value) && value.length > 0) {
        str_val = '\n' + value.map((v) => `    + ${v}`).join('\n');
      }
      console.log(`  · ${key}: ${str_val}`);
    }
  }
}

function allowed_addresses_to_visibility(addresses) {
  if (addresses.length === 1 && addresses[0] === "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc")
    return "public";
  return addresses.join(",");
}


export async function expose_table(
  datasource_id,
  source_table,
  destination_table,
  visiblity,
  capacity,
  sync_period,
  columns_mapping,
  overwrite
) {
  capacity = parseInt(capacity);
  sync_period = sync_period ? parseInt(sync_period) : parseInt(process.env.DEFAULT_SYNC_PERIOD);
  if (isNaN(capacity) || capacity < 0) {
    throw new Error(`Capacity should be an integer: '${capacity}'.`);
  }
  const datasource = await get_datasource(datasource_id);
  const source = {
    datasource: datasource_id,
    name: source_table,
  }
  const columns = await getTableColumns(datasource, source_table, columns_mapping);
  const database = global.context.account.address().to_string()
  const allowed_addresses = table_visibility_to_addresses(visiblity);

  const definition = {
    settings: {
      capacity,
      sync_period,
    },
    snarkdb_version: package_version_as_integer(global.context.package_version),
    source,
    columns,
    allowed_addresses,
    view_key: random_from_type("scalar"),
  };

  const table = await Table.from_definition(
    database,
    destination_table,
    definition
  );
  await table.save(overwrite);
  await table.close();
}



async function getTableColumns(dataSource, tableName, columnsMappingString) {
  const queryRunner = dataSource.createQueryRunner();
  const table = await queryRunner.getTable(tableName);

  if (!table) {
    throw new Error(`Table not found: '${tableName}'.`);
  }
  const is_mapped = columnsMappingString != null && columnsMappingString.length > 0;
  let columnsMapping = null;
  if (is_mapped) {
    columnsMapping = parseColumnsMapping(columnsMappingString);
  }

  const columnsInfo = table.columns
    .filter(
      ({ name }) => (!is_mapped || Object.keys(columnsMapping).includes(name))
    )
    .map(
      (column) => {
        const attribute = is_mapped ? columnsMapping[column.name] : column.name;
        const typeorm_type = (column.type === "tinyint" && column.width === 1) ? "boolean" : column.type;
        const snarkdb_type = typeorm_to_aleo_type(typeorm_type);
        return {
          typeorm: {
            name: column.name,
            type: typeorm_type
          },
          snarkdb: {
            name: attribute,
            type: snarkdb_type
          }
        }
      }
    );

  await queryRunner.release();
  return columnsInfo;
}


function parseColumnsMapping(columnsMapping) {
  if (!columnsMapping) {
    return null;
  }
  const mapping = {};
  const pairs = columnsMapping.split(',');
  for (const pair of pairs) {
    const splitted = pair.split(':');
    if (splitted.length === 1) {
      mapping[splitted[0]] = splitted[0];
    }
    else if (splitted.length === 2) {
      mapping[splitted[0]] = splitted[1];
    }
    else {
      throw new Error(`Invalid column mapping: '${pair}'.`);
    }
  }
  return mapping;
}


const typeorm_to_aleo_types = {
  "int": {
    "category": "integer",
    "value": "u128"
  },
  "smallint": {
    "category": "integer",
    "value": "u128"
  },
  "integer": {
    "category": "integer",
    "value": "u128"
  },
  "bigint": {
    "category": "integer",
    "value": "field"
  },
  "boolean": {
    "category": "boolean",
    "value": "boolean"
  },
};

function typeorm_to_aleo_type(typeorm_type) {
  const aleo_type = typeorm_to_aleo_types?.[typeorm_type];
  if (!aleo_type) {
    throw new Error(`Unsupported type: '${typeorm_type}'.`);
  }
  return aleo_type;
}



export async function get_address_tables_names(address) {
  const this_tables_dir = `${tables_dir}/${address}`;
  try {
    return await fs.readdir(this_tables_dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}


export async function get_address_table_definition(database, tablename) {
  const definition = await get_table_definition(database, tablename);
  return definition;
}


export async function get_address_table(address, tablename) {
  const definition = await get_address_table_definition(address, tablename);
  return await Table.from_definition(
    address,
    tablename,
    definition
  );
}


export async function get_address_tables(address) {
  const table_names = await get_address_tables_names(address);
  const tables = [];
  for (const table_name of table_names) {
    tables.push(
      await get_address_table(address, table_name)
    );
  }
  return tables;
}

