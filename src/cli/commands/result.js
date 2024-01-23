import {
  retrieve_query_result,
} from "snarkdb/queries/index.js";


const name = "result";
const description = "Retrieve result from a zkSQL query.";
const arg_name = "requestId";
const pattern = `${name} <${arg_name}> [OPTIONS]`;


const entrypoint = async ({ query }) => {
  await retrieve_query_result(query);
};


export default {
  name,
  description,
  pattern,
  entrypoint
}

