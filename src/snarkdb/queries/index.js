import NodeSQLParser from "node-sql-parser";

import { execute_select_query, load_select_query, select_query_to_table } from "./select.js";
export { retrieve_query_result } from "./result.js";

import { display_error } from "utils/errors.js";
import {
  public_queries_dir,
  get_public_query_dir,
} from "snarkdb/db/index.js";
import fs from "fs/promises";
import { decrypt_file_from_anyof_address } from "aleo/encryption.js";
import { aleo_struct_to_js_object } from "aleo/types/index.js";
import { decode_bigint_fields_to_string } from "aleo/types/custom_string.js";
import { Signature, Address } from '@aleohq/sdk';
import crypto from 'crypto';

export const execute_query = async (query) => {
  query = String(query)
  const parser = new NodeSQLParser.Parser();
  let ast;
  let sql;
  try {
    ast = parser.astify(query);
    console.log("Executing query:");
    sql = parser.sqlify(ast);
    console.log(sql);
    console.log();
  } catch (e) {
    console.log("/!\\ Error parsing query: ");
    display_error(e);
    return;
  }
  try {
    await execute_parsed_query(ast, sql);
  } catch (e) {
    console.log("/!\\ Error executing query: ");
    display_error(e);
    return;
  }
};


const execute_parsed_query = async (query, sql) => {
  if (query.type === "insert")
    throw new Error("INSERT queries are not supported yet.");// return await execute_insert_query(query);
  if (query.type === "select")
    return await execute_select_query(query, sql);
  if (query.type === "create") {
    if (query.keyword === "table")
      throw new Error("CREATE TABLE queries are not supported yet.");// return await execute_create_table_query(query);
    if (query.keyword === "database")
      throw Error(
        "A database is an Aleo account. "
        + "Create one by using 'snarkos account new'"
      );
    throw Error(`Unsupported 'create' query: '${query.keyword}'.`);
  }
  throw Error(`Unsupported query: ${query.type}`);
};



export const list_queries = async (incoming, outgoing) => {
  const query_ids = await fs.readdir(public_queries_dir);
  const view_key = global.context.account.viewKey();
  let first = true;
  for (const query_id of query_ids) {
    try {
      const query = await get_query_from_id(view_key, query_id);
      if (outgoing && !query.outgoing)
        continue;
      if (incoming && !query.incoming)
        continue;
      const newline = first ? "" : "\n";
      first = false;
      console.log(`${newline}- ${query_id.yellow.bold}`);
      display_query_data(
        {
          ...query.data,
          status: "pending"
        }
      );
    } catch (e) {
      continue;
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
  const parser = new NodeSQLParser.Parser();
  const ast = parser.astify(query_data.sql);
  const query = {
    data: query_data,
    ast,
  };

  const {
    froms,
    fields,
    where,
    all_owned,
    aggregates,
  } = await load_select_query(ast);

  query.table = select_query_to_table(query_id, froms, fields, where, aggregates);
  const address = global.context.account.address().to_string();
  query.outgoing = query_data.origin === address;
  query.incoming = froms.some((from) => from.database === address);
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