import { get_datasource } from "datasources/index.js";
import { Table, get_table_definition, table_visibility_to_addresses } from 'snarkdb/sql/table.js';
import { tables_dir } from "snarkdb/db/index.js";
import fs from "fs/promises";
import { Address } from "@aleohq/sdk";


export async function list_tables() {
  const tables = await get_address_tables_names(global.context.account.address().to_string());
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
      version: int_version_to_string(config.settings.version),
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

function int_version_to_string(version) {
  return (
    Math.floor(version / 10000)
    + '.' + Math.floor((version % 10000) / 100)
    + '.' + (version % 100)
  );
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
  const columns = await getTableColumns(datasource, source_table, columns_mapping);
  const database = global.context.account.address().to_string()
  const allowed_addresses = table_visibility_to_addresses(visiblity);
  const table = Table.from_columns(
    database,
    destination_table,
    columns,
    allowed_addresses,
    capacity,
    sync_period,
    datasource
  );
  const source = {
    datasource: datasource_id,
    name: source_table,
  }
  await table.save(source, columns, overwrite);
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
  const tables = await fs.readdir(this_tables_dir);
  return tables;
}


export async function get_address_table_definition(database, tablename) {
  const definition = await get_table_definition(database, tablename);
  return definition;
}


export async function get_address_table(address, tablename) {
  const definition = await get_address_table_definition(address, tablename);
  const allowed_addresses = definition.allowed_addresses.map(
    (address) => Address.from_string(address)
  );
  const datasource = await get_datasource(definition.source.datasource);
  return Table.from_columns(
    address,
    tablename,
    definition.columns,
    allowed_addresses,
    definition.settings.capacity,
    definition.settings.sync_period,
    datasource
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

