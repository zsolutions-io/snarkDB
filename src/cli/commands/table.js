import {
  list_tables,
  expose_table,
} from "tables/index.js";

import { get_help_message } from "../help.js"


const name = "table";

const expose_name = "expose";
const expose_args = [
  {
    name: "datasource",
    description: "Identifier of the datasource to use.",
    required: true,
  },
  {
    name: "sourceTable",
    description: "Name of the source table.",
    required: true,
  },
  {
    name: "destinationTable",
    description: "Name of the destination exposed table.",
    required: true,
  },
  {
    name: "visibility",
    description: "Who can see the table name and column names and types: 'public' or a list of comma separated addresses as 'aleo1l...hk,aleo1p...dd'.",
    required: true,
  },
  {
    name: "capacity",
    description: "Maximum number of rows in the table, integer.",
    required: true,
  },
  {
    name: "syncPeriod",
    description: `Amount of time in seconds between each syncronisation of a table with datasource. Default is ${process.env.DEFAULT_SYNC_PERIOD} seconds.`,
    required: false,
  },
  {
    name: "columnsMapping",
    description: "Optional mapping to expose only a subset of the columns optionally with different exposed names. Comma separated list of column names, colon new name : 'column1,column2:col2,column3:col3'.",
    required: false,
  },
  {
    name: "overwrite",
    description: "Overwrite an existing table.",
    required: false,
  },
];
const expose_pattern = `${name} ${expose_name} [OPTIONS]`;
const expose_description = `Expose a table.`;
const expose_help = get_help_message(null, expose_pattern, expose_description, expose_args);


const list_name = "list";
const list_pattern = `${name} ${list_name} [OPTIONS]`;
const list_description = `List all exposed tables.`;
const list_help = get_help_message(null, list_pattern, list_description, null);


const description = `Expose tables to be queried by other selected users.`;
const _pattern = `${name} <SUBCOMMAND> [OPTIONS]`;
const pattern = `${name} [SUBCOMMAND] [OPTIONS]`;


const actions = [
  {
    name: expose_name,
    description: expose_description
  },
  {
    name: list_name,
    description: list_description
  },
];


const entrypoint = async (args) => {
  const { SUBCOMMAND: subcommand } = args;
  if (subcommand === list_name) {
    return await list_tables();
  } else if (subcommand === expose_name) {
    const {
      datasource,
      sourceTable,
      destinationTable,
      visibility,
      capacity,
      syncPeriod,
      columnsMapping,
      overwrite,
    } = args;
    if (
      datasource == null
      || sourceTable == null
      || destinationTable == null
      || visibility == null
      || capacity == null
    )
      return console.log(expose_help);
    return await expose_table(
      datasource, sourceTable, destinationTable, visibility, capacity, syncPeriod, columnsMapping, overwrite
    );
  }
  console.log(get_help_message(actions, _pattern, description, null));
};


export default {
  name,
  description,
  pattern,
  entrypoint
}

