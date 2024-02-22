import { get_query_from_id } from './index.js';


export const process_query = async (query_id) => {
  const view_key = global.context.account.viewKey();
  const query = await get_query_from_id(view_key, query_id);
  throw_invalid_process_query(query);
  await process_execution(query.next);
};


const throw_invalid_process_query = (query) => {
  if (query.status === "processed") {
    return console.log("Query already processed");
  }
  if (query.status === "pending") {
    return console.log(`Query pending from account ${query.next.executor}`);
  }
  if (query.status !== "to_process") {
    return console.log(`Invalid query status: ${query.status}`);
  }
};


const process_execution = async (execution) => {
  await execution.table.program.save();
};