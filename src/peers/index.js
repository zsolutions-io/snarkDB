import {
  get_peer_dir,
  get_peers_dir,
  get_database_tables_dir,
} from "snarkdb/db/index.js";
import { save_object } from "utils/fs.js";

import fs from "fs/promises";
import fsExists from 'fs.promises.exists'

import { snarkdb_id_to_addresses } from 'snarkdb/accounts/index.js';
import { multiaddr } from '@multiformats/multiaddr';

import { format_libp2p_location } from 'network/helia.js';

import { read_access, empty_struct_to_columns } from 'snarkdb/sql/table.js';

const config_file_name = 'config';


export async function get_peer(identifier) {
  const config = await get_peer_config(identifier);
  return config;
}


export async function peer_tables(identifier, visible) {
  const config = await get_peer_config(identifier);
  const database = config.aleo_address;
  const tables_path = get_database_tables_dir(database, true);
  let tables = [];
  try {
    tables = await fs.readdir(tables_path);
  } catch (e) { }
  if (tables.length === 0) {
    return console.log('No tables found.');
  }
  for (const table of tables) {
    console.log(`- ${table}`);
    try {
      console.log(`Columns:`)
      const schema = await read_access(database, table);
      const columns = empty_struct_to_columns(schema);
      for (const column of columns) {
        console.log(`  ・ ${column.snarkdb.name}: ${column.snarkdb.type.value}`);
      }
    } catch (e) {
      if (!visible) {
        console.log(`Table not exposed to context account.`);
      }
    }
    console.log();
  }
}

export async function get_peer_config(identifier) {
  throw_invalid_identifier(identifier);
  const peer_path = get_peer_dir(global.context.account.address().to_string(), identifier);
  const config_path = `${peer_path}/${config_file_name}.json`;
  if (!await fsExists(config_path)) {
    throw new Error(`Peer '${identifier}' does not exist.`);
  }
  const config_content = await fs.readFile(config_path, 'utf8')
  return JSON.parse(config_content);
}


export async function connect_to_peer(node, identifier) {
  const config = await get_peer_config(identifier);
  const { host, port, ipfs_peer_id } = config;
  const location = format_libp2p_location(host, port, ipfs_peer_id);
  await node.libp2p.dial(multiaddr(location));
  return config;
}


export async function list_peers() {
  let peers = [];
  try {
    peers = await fs.readdir(
      get_peers_dir(
        global.context.account.address().to_string()
      )
    );
  } catch (e) { }
  if (peers.length === 0) {
    return console.log('No peers found.');
  }
  console.log(`Found ${peers.length} peer(s):`);
  for (const identifier of peers) {
    console.log(`\n- ${identifier}`);
    const config = await get_peer_config(identifier);

    for (const [key, value] of Object.entries(config)) {
      const val = (key === "password") ? "***" : value;
      console.log(`  ・ ${key}: ${val}`);
    }
  }
}


export async function add_peer(identifier, snarkdb_id, host, port, overwrite) {
  throw_invalid_identifier(identifier);
  if (port === undefined) {
    port = global.context.port;
  }
  const { aleo_address, ipfs_peer_id } = snarkdb_id_to_addresses(snarkdb_id);
  const peer_settings = { snarkdb_id, aleo_address, ipfs_peer_id, host, port };
  const peer_path = get_peer_dir(global.context.account.address().to_string(), identifier);
  await save_object(
    peer_path, config_file_name, peer_settings, !overwrite
  );
}


export async function remove_peer(identifier) {
  throw_invalid_identifier(identifier);
  const peer_path = get_peer_dir(global.context.account.address().to_string(), identifier);

  if (!await fsExists(peer_path)) {
    throw new Error(`peer '${identifier}' does not exist.`);
  }

  await fs.rm(peer_path, { recursive: true, force: true });
}


const throw_invalid_identifier = (identifier) => {
  const regex = /^[a-zA-Z_]+[a-zA-Z_0-9]*$/;
  if (!regex.test(identifier)) {
    throw new Error(
      'Identifier should only contain letters numbers,'
      + ' underscores and dashes.'
    );
  }
}

