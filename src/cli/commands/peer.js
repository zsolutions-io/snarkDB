import {
  list_peers,
  add_peer,
  remove_peer,
  peer_tables,
} from "peers/index.js";

import { get_help_message } from "../help.js"


const name = "peer";

const add_name = "add";
const add_args = [
  {
    name: "identifier",
    description: "Local unique identifier of the peer.",
    required: true,
  },
  {
    name: "snarkdbId",
    description: "Peer Snarkdb ID begining with 'db1'.",
    required: true,
  },
  {
    name: "host",
    description: "Host of the peer.",
    required: true,
  },
  {
    name: "port",
    description: "Port of the peer.",
    required: false,
  },
  {
    name: "overwrite",
    description: "Overwrite if a peer with that identifier already exists.",
    required: false,
  },
];
const add_pattern = `${name} ${add_name} [OPTIONS]`;
const add_description = `Add a new peer.`;
const add_help = get_help_message(null, add_pattern, add_description, add_args);

const remove_name = "remove";
const remove_args = [
  {
    name: "identifier",
    description: "Local identifier of the peer to remove.",
    required: true,
  },
];
const remove_pattern = `${name} ${remove_name} [OPTIONS]`;
const remove_description = `Remove an existing peer.`;
const remove_help = get_help_message(null, remove_pattern, remove_description, remove_args);


const tables_name = "tables";
const tables_args = [
  {
    name: "identifier",
    description: "Local identifier of the peer to list tables.",
    required: true,
  },
  {
    name: "visible",
    description: "Display only tables exposed to context account.",
    required: true,
  },
];
const tables_pattern = `${name} ${tables_name} [OPTIONS]`;
const tables_description = `List tables of a peer.`;
const tables_help = get_help_message(null, tables_pattern, tables_description, tables_args);

const list_name = "list";
const list_pattern = `${name} ${list_name} [OPTIONS]`;
const list_description = `List all existing peers.`;
const list_help = get_help_message(null, list_pattern, list_description, null);

const description = `Manage peers you want to request from.`;
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
  {
    name: tables_name,
    description: tables_description
  },
];


const entrypoint = async (args) => {
  const { SUBCOMMAND: subcommand } = args;
  if (subcommand === list_name) {
    return await list_peers();
  } else if (subcommand === add_name) {
    const { identifier, snarkdbId, host, port, overwrite } = args;
    if (identifier == null || snarkdbId == null)
      return console.log(add_help);
    return await add_peer(identifier, snarkdbId, host, port, overwrite);
  } else if (subcommand === remove_name) {
    const { identifier } = args;
    if (identifier == null)
      return console.log(remove_help);
    return await remove_peer(identifier);
  } else if (subcommand === tables_name) {
    const { identifier, visible } = args;
    if (identifier == null)
      return console.log(tables_help);
    return await peer_tables(identifier, visible);
  }
  console.log(get_help_message(actions, _pattern, description, null));
};


export default {
  name,
  description,
  pattern,
  entrypoint
}

