import {
  execute_query,
} from "snarkdb/queries/index.js";


const name = "execute";
const description = "Execute a zkSQL query.";
const arg_name = "query";
const pattern = `${name} <${arg_name}> [OPTIONS]`;

const entrypoint = async ({ query }) => {
  await execute_query(query);
};


export default {
  name,
  description,
  pattern,
  entrypoint
}