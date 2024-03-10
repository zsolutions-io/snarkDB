import {
  initThreadPool
} from "@aleohq/sdk";
import {
  get_query_from_id,
  get_query_private_result_data,
  save_query_private_result_data,
} from 'snarkdb/queries/index.js';

import {
  verify_query_results,
} from 'snarkdb/queries/verify.js';

import {
  get_address_tables
} from "tables/index.js";
import fs from 'fs/promises';
import {
  get_queries_dir,
} from "snarkdb/db/index.js";

import { mfs } from '@helia/mfs';

import { init_ipfs_node } from "network/helia.js";

const period = 60 * 1000;


export async function continuous_sync() {
  await initThreadPool();
  const { node, fs, location } = await init_ipfs();
  console.log();
  console.log(`IPFS node is up, available at:\n${String(location).bold.green}`);
  console.log();
  console.log("Starting syncronisation...");
  await Promise.all(
    [
      continuous_tables_sync(),
      continuous_queries_sync(),
    ]
  );
}


export async function init_ipfs() {
  const node = await init_ipfs_node(
    global.context.account.address().to_string(),
    global.context.ipfs,
  );
  const fs = mfs(node);
  const location = node.libp2p.getMultiaddrs()[0];
  return { node, fs, location };
}

export async function continuous_tables_sync() {
  while (true) {
    await sync_tables();
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}

export async function continuous_queries_sync() {
  while (true) {
    await sync_queries();
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}


export async function sync_tables() {
  const address = global.context.account.address().to_string();
  const tables = await get_address_tables(address);
  if (tables.length === 0) {
    return;
  }
  for (const table of tables) {
    try {
      await table.sync();
      await table.close();
    } catch (e) {
      console.log(`Error processing table '${table.name}':`);
      console.log(e);
    }
  }
}


export async function sync_queries() {
  const query_ids = await fs.readdir(get_queries_dir(true));
  const address = global.context.account.address().to_string();
  const view_key = global.context.account.viewKey();
  for (const query_id of query_ids) {
    try {
      const query = await get_query_from_id(view_key, query_id);
      let results_data = await get_query_private_result_data(
        query.data.origin, query.data.hash
      );
      if (query.status !== "processed" || results_data == null) {
        continue;
      }
      if (!results_data.checked) {
        const valid = await verify_query_results(query,);
        results_data = {
          checked: true,
          valid,
        };
        await save_query_private_result_data(
          query.data.origin, query.data.hash, results_data
        );
      }
    } catch (e) {
      console.log(`Error processing query '${query_id}':`);
      console.log(e);
    }
  }
}
