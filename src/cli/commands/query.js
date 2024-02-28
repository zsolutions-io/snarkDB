import { get_help_message } from "../help.js"
import {
  execute_query,
  retrieve_query_result,
  list_queries,
  process_query,
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
    name: "queryId",
    description: "Identifier of the query to retrieve.",
    required: true,
  },
];
const result_pattern = `${name} ${result_name} [OPTIONS]`;
const result_description = `Get results from an existing zkSQL query.`;
const result_help = get_help_message(null, result_pattern, result_description, result_args);

const list_name = "list";
const list_args = [
  {
    name: "incoming",
    description: "Incoming requests only.",
    required: false,
  },
  {
    name: "outgoing",
    description: "Outgoing requests only.",
    required: false,
  },
];

const list_pattern = `${name} ${list_name} [OPTIONS]`;
const list_description = (
  "List zkSQL requests related to your address. At least one of "
  + list_args.map(({ name }) => `'${name}'`).join(" or ")
  + " options is required."
);
const list_help = get_help_message(null, list_pattern, list_description, list_args);

const description = `Initiate, process and manage zkSQL queries.`;
const _pattern = `${name} <SUBCOMMAND> [OPTIONS]`;
const pattern = `${name} [SUBCOMMAND] [OPTIONS]`;

const process_name = "process";
const process_args = [
  {
    name: "queryId",
    description: "Identifier of the query to process.",
    required: true,
  },
];
const process_pattern = `${name} ${process_name} [OPTIONS]`;
const process_description = `Process an incoming zkSQL query.`;
const process_help = get_help_message(null, process_pattern, process_description, process_args);


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
  {
    name: process_name,
    description: process_description
  },
];


const entrypoint = async (args) => {
  const { SUBCOMMAND: subcommand } = args;
  if (subcommand === list_name) {
    const {
      incoming,
      outgoing,
    } = args;
    if (!incoming && !outgoing)
      return console.log(list_help);
    return await list_queries(Boolean(incoming), Boolean(outgoing));
  }
  if (subcommand === result_name) {
    const {
      queryId,
      pipe,
    } = args;
    if (
      queryId == null
    )
      return console.log(result_help);
    return await request_result(queryId);
  }
  if (subcommand === execute_name) {
    const {
      query,
    } = args;
    if (
      query == null
    )
      return console.log(execute_help);
    return await execute_query(query);
  }
  if (subcommand === process_name) {
    const {
      queryId,
    } = args;
    if (
      queryId == null
    )
      return console.log(process_help);
    return await process_query(queryId);
  }

  console.log(get_help_message(actions, _pattern, description, null));
};



export default {
  name,
  description,
  pattern,
  entrypoint
}

