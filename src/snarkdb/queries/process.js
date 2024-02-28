import { get_query_from_id } from './index.js';
import { process_select_from_commit } from 'snarkdb/db/commit.js'
import {
  initThreadPool
} from "@aleohq/sdk";

export const process_query = async (query_id) => {
  const view_key = global.context.account.viewKey();
  const query = await get_query_from_id(view_key, query_id);
  throw_invalid_process_query(query);
  await initThreadPool();
  await process_execution(query_id, query.next);
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


const process_execution = async (query_id, execution) => {
  await execution.query_table.program.save();
  const commit_id = execution.from_table.commit_id;
  const table_name = execution.from_table.name;
  await process_select_from_commit(
    query_id,
    { name: table_name, database: execution.from_table.database },
    { id: commit_id },
    execution.index
  );

};