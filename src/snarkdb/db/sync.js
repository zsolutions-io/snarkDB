import {
  initThreadPool
} from "@aleohq/sdk";
import {
  get_query_from_id,
  get_query_private_result_data,
  save_query_private_result_data,
} from 'snarkdb/queries/index.js';
import { get_peer_dir, peers_dir } from "snarkdb/db/index.js";
import {
  verify_query_results,
} from 'snarkdb/queries/verify.js';

import {
  get_address_tables
} from "tables/index.js";
import fs from 'fs/promises';
import {
  get_queries_dir,
  get_database_tables_dir,
} from "snarkdb/db/index.js";
import { connect_to_peer } from "peers/index.js";

import { remove_commit } from "snarkdb/db/commit.js";

import { table_get_outdated_commits } from "snarkdb/sql/table.js";

import {
  init_ipfs_node,
  compute_cid,
  get_all_local_files,
  get_all_remote_files,
} from "network/helia.js";
import { ipns } from '@helia/ipns';
import { pubsub, helia, } from '@helia/ipns/routing';
import { mfs, } from '@helia/mfs';
import { peerIdFromString } from '@libp2p/peer-id';

import fsExists from 'fs.promises.exists';

const period = 60 * 1000;


export async function continuous_sync() {
  await initThreadPool();
  const { node, ipfs_fs, location, ipns } = await init_ipfs();
  console.log();
  console.log(`IPFS node is up, available at:\n${String(location).bold.green}`);
  console.log();
  console.log("Starting syncronisation...");

  process
    .on('unhandledRejection', (reason, p) => {
      console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
      console.error(err, 'Uncaught Exception thrown');
      process.exit(1);
    });


  await Promise.all(
    [
      continuous_tables_sync(node, ipfs_fs, ipns),
      //continuous_queries_sync(),
    ]
  );
}


export async function init_ipfs() {
  const node = await init_ipfs_node(
    global.context.account.address().to_string(),
    global.context.ipfs.peerId,
  );
  const ipfs_fs = mfs(node);
  const location = node.libp2p.getMultiaddrs()[0];

  const name_pubsub = ipns(node, {
    routers: [
      helia(node),
      pubsub(node),
    ]
  })
  const name = ipns(node)

  return { node, ipfs_fs, location, ipns: { pubsub: name_pubsub, default: name } };
}


export async function continuous_tables_sync(node, ipfs_fs, ipns) {
  while (true) {
    await sync_tables(node, ipfs_fs, ipns);
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}


export async function continuous_queries_sync() {
  while (true) {
    await sync_queries();
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}


export async function sync_tables(node, ipfs_fs, ipns) {
  const address = global.context.account.address().to_string();
  const tables = await get_address_tables(address);
  if (tables.length === 0) {
    return;
  }
  for (const table of tables) {
    try {
      await table.sync();
      const outdated = await table_get_outdated_commits(
        table.database, table.name
      );
      for (const commit of outdated) {
        try {
          await remove_commit(table.database, table.name, commit.id, true);
        } catch (e) { }
        try {
          await remove_commit(table.database, table.name, commit.id);
        } catch (e) { }
      }
    } catch (e) {
      console.log(`Error processing table '${table.name}':`);
      console.log(e);
    }
    await table.close();
  }
  try {
    await sync_public_dir_tables(node, ipfs_fs, ipns);
  } catch (e) {
    console.log(`Error syncing public tables:`);
    console.log(e);
  }
}


export async function sync_queries() {
  const query_ids = await fdirectory.readdir(get_queries_dir(true));
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


export async function sync_public_dir_tables(node, ipfs_fs, ipns) {
  await sync_local_to_remote_public_dir_tables(node, ipfs_fs, ipns);
  await remote_to_local_public_dir_tables(node, ipfs_fs, ipns);
}


export async function sync_local_to_remote_public_dir_tables(node, ipfs_fs, ipns) {
  const address = global.context.account.address().to_string();
  const database_tables_dir = get_database_tables_dir(address, true);

  const remote_tables_path = "/tables";
  try {
    await ipfs_fs.stat(remote_tables_path);
  } catch (e) {
    if (e.code === "ERR_DOES_NOT_EXIST") {
      await ipfs_fs.mkdir(remote_tables_path);
    }
  }
  const updated = await sync_local_to_remote(
    database_tables_dir, remote_tables_path, ipfs_fs
  );
  if (updated) {
    await publish_ipns(node, ipfs_fs, ipns);
  }
}


export async function remote_to_local_public_dir_tables(node, ipfs_fs, ipns) {
  let peers = [];
  try {
    peers = await fs.readdir(peers_dir);
  } catch (e) { }
  for (const identifier of peers) {
    const {
      snarkdb_id, aleo_address, ipfs_peer_id, host, port
    } = await connect_to_peer(node, identifier)
    const database_tables_dir = get_database_tables_dir(aleo_address, true);
    const remote = await ipns.pubsub.resolve(peerIdFromString(ipfs_peer_id));
    const remote_tables_path = remote.cid.toString() + "/tables";

    if (!await fsExists(database_tables_dir)) {
      await fs.mkdir(database_tables_dir);
    }
    await sync_remote_to_local(
      remote_tables_path, database_tables_dir, ipfs_fs.unixfs
    );
  }
}

async function sync_remote_to_local(remote_path, local_dir_path, ipfs_fs) {
  const remote = await get_all_remote_files(ipfs_fs, remote_path);
  const local = await get_all_local_files(local_dir_path);
  if (remote_path.endsWith('/')) {
    remote_path = remote_path.slice(0, -1);
  }
  local.files.forEach((f) => {
    f.path_compared = remote_path + "/" + f.path;
  });
  const to_add = remote.files.filter((file) => {
    const local_file = local.files.find((f) => f.path_compared === file.path);
    if (file.type === "directory") {
      return local_file === undefined;
    } else {
      return local_file === undefined || local_file.cid.toString() !== file.cid.toString();
    }
  });
  const to_remove = local.files
    .filter((file) => {
      const remote_file = remote.files.find((f) => f.path === file.path_compared);
      if (file.unixfs !== undefined) {
        return remote_file === undefined;
      } else {
        return remote_file === undefined || remote_file.cid.toString() !== file.cid.toString();
      }
    });
  to_remove.sort((a, b) => a.path.length - b.path.length);
  to_add.sort((a, b) => a.path.length - b.path.length);
  console.log()
  console.log()
  console.log()
  console.log()
  console.log()
  console.log()
  console.log()
  console.log({ local: local.files, remote: remote.files })
  console.log()
  console.log()
  console.log()
  console.log()
  console.log()
  console.log()
  console.log()
  console.log({ to_add, to_remove })

  for (const file of to_remove) {
    try {
      await fs.rm(file.path, { recursive: true });
    } catch (e) { }
  }
  for (const file of to_add) {
    const path_to_add = local_dir_path + file.path.slice(remote_path.length);
    try {
      if (file.type === "directory") {
        await fs.mkdir(local_dir_path + "/" + path_to_add, { recursive: true });
      } else {
        for await (const file_data of file.content()) {
          await fs.appendFile(
            path_to_add, file_data
          );
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
}


async function sync_local_to_remote(local_dir_path, remote_path, ipfs_fs) {
  const local = await get_all_local_files(local_dir_path);
  if (!remote_path.startsWith('/')) {
    remote_path = '/' + remote_path;
  }
  if (remote_path.endsWith('/')) {
    remote_path = remote_path.slice(0, -1);
  }
  local.files.forEach((f) => {
    f.path_compared = remote_path.slice(1) + "/" + f.path;
  });
  const remote = await get_all_remote_files(ipfs_fs, remote_path)
  const local_cid = local.cid?.toString == null ? null : local.cid.toString();
  const remote_cid = remote.cid?.toString == null ? null : remote.cid.toString();
  if (local_cid === remote_cid) {
    return;
  }
  const to_add = local.files.filter((file) => {
    const remote_file = remote.files.find((f) => f.path === file.path_compared);
    if (file.unixfs !== undefined) {
      return remote_file === undefined;
    } else {
      return remote_file === undefined || remote_file.cid.toString() !== file.cid.toString();
    }
  });
  const to_remove = remote.files
    .filter((file) => {
      const local_file = local.files.find((f) => f.path_compared === file.path);
      if (file.type === "directory") {
        return local_file === undefined;
      } else {
        return local_file === undefined || local_file.cid.toString() !== file.cid.toString()
      }
    });
  to_remove.sort((a, b) => a.path.length - b.path.length);
  to_add.sort((a, b) => a.path.length - b.path.length);

  if (to_add.length === 0 && to_remove.length === 0) {
    return;
  }

  for (const file of to_remove) {
    try {
      await ipfs_fs.rm("/" + file.path, { force: true });
    } catch (e) { }
  }

  for (const file of to_add) {
    try {
      if (file.unixfs !== undefined) {
        await ipfs_fs.mkdir("/" + file.path_compared);
      } else {
        const file_data = await fs.readFile(
          local_dir_path + "/" + file.path
        );
        await ipfs_fs.writeBytes(
          file_data, "/" + file.path_compared
        );
      }
    } catch (e) { }
  }
  return true;
}


async function publish_ipns(node, ipfs_fs, ipns) {
  try {
    const reps = await Promise.all([
      (async () => {
        try {
          return await ipns.default.publish(node.libp2p.peerId, ipfs_fs.root);
        } catch (e) { }
      })(),
      (async () => {
        try {
          return await ipns.pubsub.publish(node.libp2p.peerId, ipfs_fs.root);
        } catch (e) { }
      })()
    ]);
    const path = reps?.[0]?.value || reps?.[1]?.value;
    if (path)
      console.log(`IPNS published at:\n${path}`);
  } catch (e) { }
}

