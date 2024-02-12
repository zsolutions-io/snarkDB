import {
  list_datasources,
  add_datasource,
  remove_datasource,
} from "datasources/index.js";

import { get_help_message } from "../help.js"


const name = "datasource";

const add_name = "add";
const add_args = [
  {
    name: "datasourceJson",
    description: "JSON containing datasource connection informations.",
    required: true,
  },
  {
    name: "identifier",
    description: "Local unique identifier of the datasource.",
    required: true,
  },
  {
    name: "overwrite",
    description: "Overwrite if a datasource with that identifier already exists.",
    required: false,
  }
];
const add_pattern = `${name} ${add_name} [OPTIONS]`;
const add_description = `Add a new datasource.`;
const add_help = get_help_message(null, add_pattern, add_description, add_args);

const remove_name = "remove";
const remove_args = [
  {
    name: "identifier",
    description: "Local identifier of the datasource to remove.",
    required: true,
  },
];
const remove_pattern = `${name} ${remove_name} [OPTIONS]`;
const remove_description = `Remove an existing datasource.`;
const remove_help = get_help_message(null, remove_pattern, add_description, remove_args);

const list_name = "list";
const list_pattern = `${name} ${list_name} [OPTIONS]`;
const list_description = `List all existing datasources.`;
const list_help = get_help_message(null, list_pattern, list_description, null);


const description = `Manage datasources you want to expose data from.`;
const _pattern = `${name} <SUBCOMMAND> [OPTIONS]`;
const pattern = `${name} [SUBCOMMAND] [OPTIONS]`;


const actions = [
  {
    name: add_name,
    description: add_description
  },
  {
    name: remove_name,
    description: remove_description
  },
  {
    name: list_name,
    description: list_description
  },
];

// snarkdb datasources add --identifier test --datasourceJson '{"type": "mysql","host": "127.0.0.1","port": 3306,"username": "root","password": "my-secret-pw", "database": "testdb"}' --overwrite


const entrypoint = async (args) => {
  const { SUBCOMMAND: subcommand } = args;
  if (subcommand === list_name) {
    return await list_datasources();
  } else if (subcommand === add_name) {
    const { identifier, datasourceJson, overwrite } = args;
    if (identifier == null || datasourceJson == null)
      return console.log(add_help);
    return await add_datasource(identifier, datasourceJson, overwrite);
  } else if (subcommand === remove_name) {
    const { identifier } = args;
    if (identifier == null)
      return console.log(remove_help);
    return await remove_datasource(identifier);
  }
  console.log(get_help_message(actions, _pattern, description, null));
};


export default {
  name,
  description,
  pattern,
  entrypoint
}

