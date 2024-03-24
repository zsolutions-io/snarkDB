import { get_query_from_id } from './index.js';
import { process_select_from_commit } from 'snarkdb/db/commit.js'

import {
  get_approved_queries_dir,
} from "snarkdb/db/index.js";

import { save_object } from 'utils/fs.js';


export const process_query = async (query_id) => {
  const view_key = global.context.account.viewKey();
  const query = await get_query_from_id(view_key, query_id);
  throw_invalid_process_query(query);

  await process_execution(
    global.context.account.address.to_string(),
    query_id,
    query.next
  );
};


export const approve_query = async (query_id) => {
  const view_key = global.context.account.viewKey();
  const query = await get_query_from_id(view_key, query_id);
  throw_invalid_process_query(query);
  const approved_dir = get_approved_queries_dir(
    global.context.account.address().to_string()
  );
  await save_object(approved_dir, query_id, query);
};


const throw_invalid_process_query = (query) => {
  if (query.status === "processed") {
    throw new Error("Query already processed");
  }
  if (query.status === "pending") {
    throw new Error(`Query pending from account ${query.next.executor}`);
  }
  if (query.status !== "to_process") {
    throw new Error(`Invalid query status: ${query.status}`);
  }
};


const process_execution = async (origin, query_id, execution) => {
  await execution.query_table.program.save();
  const commit_id = execution.from_table.commit_id;
  const table_name = execution.from_table.name;
  await process_select_from_commit(
    origin,
    query_id,
    { name: table_name, database: execution.from_table.database },
    { id: commit_id },
    execution.index
  );
};