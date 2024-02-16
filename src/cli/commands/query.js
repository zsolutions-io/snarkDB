import { get_help_message } from "../help.js"
import {
  execute_query,
  retrieve_query_result,
} from "snarkdb/queries/index.js";

const name = "query";


const execute_name = "execute";
const execute_args = [
  {
    name: "query",
    description: "zkSQL query to execute.",
    required: true,
  },
];
const execute_pattern = `${name} ${execute_name} [OPTIONS]`;
const execute_description = `Execute a new zkSQL query.`;
const execute_help = get_help_message(null, execute_pattern, execute_description, execute_args);

const result_name = "result";
const result_args = [
  {
    name: "query_id",
    description: "Identifier of the query to retrieve.",
    required: true,
  },
];
const result_pattern = `${name} ${result_name} [OPTIONS]`;
const result_description = `Get results from an existing zkSQL query.`;
const result_help = get_help_message(null, result_pattern, execute_description, result_args);

const list_name = "list";
const list_pattern = `${name} ${list_name} [OPTIONS]`;
const list_description = `List all zkSQL requests related to your address.`;
const list_help = get_help_message(null, list_pattern, list_description, null);


const description = `Initiate outgoing and process incoming zkSQL queries.`;
const _pattern = `${name} <SUBCOMMAND> [OPTIONS]`;
const pattern = `${name} [SUBCOMMAND] [OPTIONS]`;


const actions = [
  {
    name: execute_name,
    description: execute_description
  },
  {
    name: result_name,
    description: result_description
  },
  {
    name: list_name,
    description: list_description
  },
];


const entrypoint = async (args) => {
  const { SUBCOMMAND: subcommand } = args;
  if (subcommand === list_name) {
    const {
      incoming,
      outgoing,
    } = args;
    return await list_queries(incoming, outgoing);
  } else if (subcommand === result_name) {
    const {
      query_id,
      pipe,
    } = args;
    if (
      query_id == null
    )
      return console.log(result_help);
    return await request_result(query_id);
  } else if (subcommand === execute_name) {
    const {
      query,
    } = args;
    if (
      query == null
    )
      return console.log(execute_help);
    return await execute_query(query);
  }

  console.log(get_help_message(actions, _pattern, description, null));
};



export default {
  name,
  description,
  pattern,
  entrypoint
}

