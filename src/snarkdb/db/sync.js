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
  get_query_results,
} from 'snarkdb/queries/verify.js';
import {
  encrypted_query_filename
} from 'snarkdb/queries/select.js';

import {
  get_address_tables
} from "tables/index.js";
import fs from 'fs/promises';
import {
  get_queries_dir,
  get_database_tables_dir,
  get_database_queries_dir,
  get_approved_queries_dir,
  get_merged_query_executions_dir,
  get_peers_dir,
  get_merged_query_dir,
  get_query_dir,
  get_query_executions_dir,
  get_merged_query_execution_dir,
  get_query_execution_dir,
  merged_dir,
} from "snarkdb/db/index.js";
import { connect_to_peer } from "peers/index.js";

import { remove_commit } from "snarkdb/db/commit.js";

import { table_get_outdated_commits } from "snarkdb/sql/table.js";
import { process_query } from "snarkdb/queries/process.js";

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
      continuous_queries_sync(node, ipfs_fs, ipns),
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
    await sync_tables();
    try {
      await sync_public_dir(
        node, ipfs_fs, ipns, "tables", get_database_tables_dir
      );
    } catch (e) {
      console.log(`Error syncing public tables:`);
      console.log(e);
    }
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}


export async function continuous_queries_sync(node, ipfs_fs, ipns) {
  while (true) {
    try {
      await sync_queries();
      await sync_public_dir(
        node, ipfs_fs, ipns, "queries", get_database_queries_dir
      );
      await merge_queries();
    } catch (e) {
      console.log(`Error syncing public queries:`);
      console.log(e);
    }
    await new Promise((resolve) => setTimeout(resolve, period));
  }
}


export async function merge_queries() {
  const public_queries_dir = get_queries_dir(true);
  const owners = await fs.readdir(public_queries_dir);
  for (const owner of owners) {
    const query_ids = await fs.readdir(public_queries_dir);
    for (const query_id of query_ids) {
      try {
        await merge_query(owner, query_id);
      } catch (e) {
        console.log(`Error merging query '${query_id}' from ${owner}:`);
        console.log(e);
      }
    }
  }
}

async function merge_query(owner, query_id) {
  const public_query_dir = get_query_dir(owner, query_id, true);
  const public_query_desc_path = `${public_query_dir}/${encrypted_query_filename}.json`
  if (!(await fsExists(public_query_desc_path))) {
    return;
  }
  const merged_query_dir = get_merged_query_dir(query_id);
  if (!(await fsExists(merged_query_dir))) {
    await fs.mkdir(merged_query_dir, { recursive: true });
  }
  const merged_query_desc_path = `${merged_query_dir}/${encrypted_query_filename}.json`
  if (await fsExists(merged_query_desc_path)) {
    const merged_query_desc_cid = await compute_cid(merged_query_desc_path);
    const public_query_desc_cid = await compute_cid(public_query_desc_path);
    if (merged_query_desc_cid !== public_query_desc_cid) {
      throw Error(`Query mismatch for query '${query_id}' from '${owner}'`);
    }
  }
  await merge_executions(owner, query_id);
}

async function merge_executions(owner, query_id) {
  const public_query_executions_dir = get_query_executions_dir(owner, query_id, true);
  if (!(await fsExists(public_query_executions_dir))) {
    return;
  }
  const merged_query_executions_dir = get_merged_query_executions_dir(query_id);
  if (!(await fsExists(merged_query_executions_dir))) {
    await fs.mkdir(merged_query_executions_dir, { recursive: true });
  }
  const public_execution_ids = await fs.readdir(public_query_executions_dir);
  for (const public_execution_id of public_execution_ids) {
    await merge_execution(owner, query_id, public_execution_id);
  }
}

async function merge_execution(owner, query_id, execution_index) {
  const merged_query_execution_dir = get_merged_query_execution_dir(
    query_id, execution_index
  );
  const public_query_execution_dir = get_query_execution_dir(
    owner, query_id, execution_index
  );
  if (await fsExists(merged_query_execution_dir)) {
    const merged_query_exec_cid = await compute_cid(merged_query_execution_dir);
    const public_query_exec_cid = await compute_cid(public_query_execution_dir);
    if (merged_query_exec_cid !== public_query_exec_cid) {
      throw Error(`Execution mismatch for query '${query_id}' from '${owner}'`);
    }
    return;
  }
  await fs.mkdir(merged_query_execution_dir, { recursive: true });
  await fs.cp(public_query_execution_dir, merged_query_execution_dir);
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
}


export async function sync_queries() {
  const approved_dir = get_approved_queries_dir(
    global.context.account.address().to_string()
  );
  try {
    const files = await fs.readdir(approved_dir);
    console.log(`Processing ${files.length} approved queries...`);
    for (const file of files) {
      const query_id = file.split('.').at(0);
      await process_query(query_id);
      await fs.rm(approved_dir + "/" + file);
    }
  }
  catch (e) {
    console.log(e)
  }
  const view_key = global.context.account.viewKey();
  const query_ids = await fs.readdir(merged_dir);
  for (const query_id of query_ids) {
    try {
      const query = await get_query_from_id(view_key, query_id);
      let results_data = await get_query_private_result_data(
        query.data.origin, query.data.hash,
      );
      if (query.status !== "processed" || results_data == null) {
        continue;
      }
      if (!results_data.checked) {
        const valid = await verify_query_results(query_id, query);
        await get_query_results(query_id, query,);
        results_data = {
          checked: true,
          valid,
        };
        /*
        await save_query_private_result_data(
          query.data.origin, query.data.hash, results_data
        );
        */
      }
    } catch (e) {
      console.log(`Error processing query '${query_id}':`);
      console.log(e);
    }
  }
}


export async function sync_public_dir(
  node, ipfs_fs, ipns, dir, get_dir_from_address
) {
  await sync_local_to_remote_public_dir(
    node, ipfs_fs, ipns, dir, get_dir_from_address
  );
  await remote_to_local_public_dir(
    node, ipfs_fs, ipns, dir, get_dir_from_address
  );
}


export async function sync_local_to_remote_public_dir(
  node, ipfs_fs, ipns, dir, get_dir_from_address
) {
  const address = global.context.account.address().to_string();
  const database_tables_dir = get_dir_from_address(address, true);

  const remote_tables_path = "/" + dir;
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


export async function remote_to_local_public_dir(
  node, ipfs_fs, ipns, dir, get_dir_from_address
) {
  let peers = [];
  try {
    peers = await fs.readdir(
      get_peers_dir(
        global.context.account.address().to_string()
      )
    );
  } catch (e) { }
  for (const identifier of peers) {
    const {
      snarkdb_id, aleo_address, ipfs_peer_id, host, port
    } = await connect_to_peer(node, identifier);
    const database_tables_dir = get_dir_from_address(aleo_address, true);
    const remote = await ipns.pubsub.resolve(peerIdFromString(ipfs_peer_id));
    const remote_tables_path = remote.cid.toString() + "/" + dir;

    if (!await fsExists(database_tables_dir)) {
      await fs.mkdir(database_tables_dir, { recursive: true });
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

  console.log("sync_remote_to_local")
  console.log({ to_add, to_remove })

  for (const file of to_remove) {
    try {
      await fs.rm(local_dir_path + "/" + file.path, { recursive: true });
    } catch (e) { console.log(e) }
  }
  for (const file of to_add) {
    const path_to_add = local_dir_path + file.path.slice(remote_path.length);
    try {
      if (file.type === "directory") {
        await fs.mkdir(path_to_add, { recursive: true });
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

  console.log("sync_local_to_remote")
  console.log({ to_add, to_remove })
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

