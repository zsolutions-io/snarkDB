import NodeSQLParser from "node-sql-parser";

import { execute_select_query, load_select_query, select_query_to_table } from "./select.js";
export { retrieve_query_result } from "./result.js";

import { display_error } from "utils/errors.js";
import { save_object } from "utils/index.js";
import {
  get_queries_dir,
  get_public_query_dir,
  get_query_executions_dir,
  get_query_execution_dir,
  get_private_query_dir,
} from "snarkdb/db/index.js";
import fs from "fs/promises";
import fsExists from "fs.promises.exists";
import { decrypt_file_from_anyof_address } from "aleo/encryption.js";
import { aleo_struct_to_js_object } from "aleo/types/index.js";
import { decode_bigint_fields_to_string } from "aleo/types/custom_string.js";
import { Signature, Address } from '@aleohq/sdk';
import crypto from 'crypto';
export * from "./process.js";

export const execute_query = async (query) => {
  query = String(query)
  const parser = new NodeSQLParser.Parser();
  let ast;
  try {
    ast = parser.astify(query);
    parser.sqlify(ast);
  } catch (e) {
    console.log("/!\\ Error parsing query: ");
    display_error(e);
    return;
  }
  try {
    await execute_parsed_query(ast);
  } catch (e) {
    console.log("/!\\ Error executing query: ");
    display_error(e);
    return;
  }
};


const execute_parsed_query = async (query) => {
  if (query.type === "insert")
    throw new Error("INSERT queries are not supported.");// return await execute_insert_query(query);
  if (query.type === "select")
    return await execute_select_query(query);
  if (query.type === "create") {
    if (query.keyword === "table")
      throw new Error("CREATE TABLE queries are not supported.");// return await execute_create_table_query(query);
    if (query.keyword === "database")
      throw Error(
        "A database is an Aleo account. "
        + "Create one by using 'snarkos account new'."
      );
    throw Error(`Unsupported 'create' query: '${query.keyword}'.`);
  }
  throw Error(`Unsupported query: ${query.type}`);
};


export const list_queries = async (incoming, outgoing) => {
  const query_ids = await fs.readdir(get_queries_dir(true));
  const view_key = global.context.account.viewKey();
  let first = true;
  for (const query_id of query_ids) {
    try {
      const query = await get_query_from_id(view_key, query_id);
      if ((!outgoing || !query.outgoing) && (!incoming || !query.incoming))
        continue;
      const newline = first ? "" : "\n";
      first = false;
      console.log(`${newline}- ${query_id.yellow.bold}`);

      let displayed_status = query.status;
      if (query.status === "pending") {
        displayed_status = `Pending from ${query.next.executor.italic}`.blue.bold;
      }
      if (query.status === "processed") {
        displayed_status = "Processed".green.bold;
      }
      if (query.status === "to_process") {
        displayed_status = "To process".red.bold;
      }
      display_query_data(
        {
          ...query.data,
          incoming: query.incoming ? "✓" : " ",
          outgoing: query.outgoing ? "✓" : " ",
          status: displayed_status,
        }
      );
    } catch (e) {
      console.log(`Error processing query '${query_id}':`);
      console.log(e);
    }
  }
}


const display_query_data = (query_data) => {
  for (const [key, value] of Object.entries(query_data)) {
    if (key === 'query_id')
      continue;
    let dkey = key;
    if (key === 'sql')
      dkey = "query";
    let str_val = value;
    if (Array.isArray(value) && value.length > 0) {
      str_val = value.map((v) => `    + ${v}`).join('\n');
    }
    console.log(`  · ${dkey.green.bold}\t${str_val}`);
  }
}


export const get_query_from_id = async (view_key, query_id) => {
  const query_data = await get_query_data_from_id(view_key, query_id);
  const executions = await get_executions_from_query_id(query_id);
  const parser = new NodeSQLParser.Parser();
  const ast = parser.astify(query_data.sql);
  const query = {
    data: query_data,
    ast,
    executions,
  };
  const select_query = await load_select_query(ast);
  const {
    froms,
    fields,
    where,
    all_owned,
    aggregates,
  } = select_query;
  query.table = select_query_to_table(query_id, froms, fields, where, aggregates);
  query.table.query = select_query;
  const address = global.context.account.address().to_string();
  query.outgoing = query_data.origin === address;
  query.incoming = froms.some((from) => from.database === address);
  const query_table_executions = query.table.executions;
  if (query_table_executions.length === executions.length) {
    query.status = "processed";
  } else {
    query.next = query_table_executions[executions.length];
    query.status = (query.next.executor === address) ? "to_process" : "pending";
  }
  return query;
}


export const get_query_data_from_id = async (view_key, query_id) => {
  const query_dir = get_public_query_dir(query_id);
  const query_path = `${query_dir}/encrypted_query.json`;
  const decrypted_query = await decrypt_file_from_anyof_address(
    view_key,
    query_path,
  );
  const query_data = decrypted_query_to_data(decrypted_query, query_id);
  return query_data;
}


export const get_query_private_result_data = async (origin, query_hash) => {
  const query_dir = get_private_query_dir(origin, query_hash);

  if (!await fsExists(query_dir)) {
    return null;
  }

  const query_results_data_path = `${query_dir}/results.json`;

  if (!await fsExists(query_results_data_path)) {
    return {
      checked: false,
    };
  }
  const query_results_data = JSON.parse(
    await fs.readFile(query_results_data_path, 'utf-8')
  );
  return query_results_data;
}

export const save_query_private_result_data = async (origin, query_hash, data) => {
  const query_dir = get_private_query_dir(origin, query_hash);
  await save_object(
    query_dir, 'results', data,
  );
}


export const get_executions_from_query_id = async (query_id) => {
  const query_dir = get_query_executions_dir(query_id);
  if (!await fsExists(query_dir))
    return [];
  const executions = (await fs.readdir(query_dir)).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  return executions;
}

export const get_execution_from_query_id = async (query_id, index) => {
  const query_dir = get_query_execution_dir(query_id, index);
  if (!await fsExists(query_dir))
    return [];
  const executions = (await fs.readdir(query_dir)).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  return executions;
}


const decrypted_query_to_data = (decrypted_query, query_id) => {
  const decrypted_query_js_object = aleo_struct_to_js_object(decrypted_query);
  const query_data = {
    query_id: decode_bigint_fields_to_string([decrypted_query_js_object.id]),
    sql: decode_bigint_fields_to_string(decrypted_query_js_object.sql),
  };
  query_data.hash =
    crypto
      .createHash('sha256')
      .update(query_data.sql)
      .digest('hex');
  query_data.origin = decrypted_query_js_object.origin;
  const origin_address = Address.from_string(query_data.origin);

  const message = new TextEncoder(
    "utf-8"
  ).encode(query_data.sql);
  const signature = Signature.from_string(decrypted_query_js_object.sig);
  const checked = signature.verify(origin_address, message);
  if (!checked)
    throw new Error(`Invalid signature for decrypted query with id '${query_id}'.`);
  if (query_data.query_id !== query_id)
    throw new Error(`Invalid id for decrypted query: '${query_id}'.`);
  return query_data;
}