import { get_peer_dir, peers_dir } from "snarkdb/db/index.js";
import { save_object } from "utils/fs.js";

import fs from "fs/promises";
import fsExists from 'fs.promises.exists'

import { snarkdb_id_to_addresses } from 'snarkdb/accounts/index.js';


const config_file_name = 'config';


export async function get_peer(identifier) {
  const config = await get_peer_config(identifier);
  return config;
}


export async function get_peer_config(identifier) {
  throw_invalid_identifier(identifier);
  const peer_path = get_peer_dir(identifier);
  const config_path = `${peer_path}/${config_file_name}.json`;
  const config_content = await fs.readFile(config_path, 'utf8')
  return JSON.parse(config_content);
}


export async function list_peers() {
  const peers = await fs.readdir(peers_dir);
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


export async function add_peer(identifier, snarkdb_id, overwrite) {
  throw_invalid_identifier(identifier);
  const { aleo_address, ipfs_peer_id } = snarkdb_id_to_addresses(snarkdb_id);
  const peer_settings = { snarkdb_id, aleo_address, ipfs_peer_id, host, port };
  const peer_path = get_peer_dir(identifier);
  await save_object(
    peer_path, config_file_name, peer_settings, !overwrite
  );
}


export async function remove_peer(identifier) {
  throw_invalid_identifier(identifier);
  const peer_path = get_peer_dir(identifier);

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



const connect_to_peer = async (location) => {
  const node = global.context.node;
  await node.libp2p.dial(location);
  // snarkvm_address = ;
}