import { get_query_from_id } from './index.js';
import { process_select_from_commit } from 'snarkdb/db/commit.js'
import {
  initThreadPool
} from "@aleohq/sdk";
import {
  merged_dir,
  get_database_queries_dir,
  get_approved_queries_dir,
} from "snarkdb/db/index.js";
import fs from "fs/promises";
import { save_object } from 'utils/fs.js';


export const process_query = async (query_id) => {
  const view_key = global.context.account.viewKey();
  const queries_dir = merged_dir;
  const owners = await fs.readdir(queries_dir);
  let found_owner = null;
  for (const owner of owners) {
    const owner_dir = get_database_queries_dir(owner, true)
    const query_ids = await fs.readdir(owner_dir);
    for (const comp_query_id of query_ids) {
      if (comp_query_id === query_id) {
        found_owner = owner;
      }
    }
  };
  if (found_owner == null) {
    throw new Error(`Query with id '${query_id}' not found.`);
  }
  const query = await get_query_from_id(view_key, found_owner, query_id);
  throw_invalid_process_query(query);
  await process_execution(found_owner, query_id, query.next);
};


export const approve_query = async (query_id) => {
  const view_key = global.context.account.viewKey();
  const queries_dir = merged_dir;
  const owners = await fs.readdir(queries_dir);
  let found_owner = null;
  for (const owner of owners) {
    const owner_dir = get_database_queries_dir(owner, true)
    const query_ids = await fs.readdir(owner_dir);
    for (const comp_query_id of query_ids) {
      if (comp_query_id === query_id) {
        found_owner = owner;
      }
    }
  };
  if (found_owner == null) {
    throw new Error(`Query with id '${query_id}' not found.`);
  }
  const query = await get_query_from_id(view_key, found_owner, query_id);
  throw_invalid_process_query(query);
  const approved_dir = get_approved_queries_dir(global.context.account.address().to_string());
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