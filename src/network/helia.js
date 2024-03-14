

import { FsBlockstore } from 'blockstore-fs';
import { FsDatastore } from 'datastore-fs';
import { MemoryDatastore } from 'datastore-core';
import { MemoryBlockstore } from 'blockstore-core';

import { createHelia, libp2pDefaults } from 'helia';


import { gossipsub } from '@chainsafe/libp2p-gossipsub';


import { unixfs, globSource } from '@helia/unixfs';
import { get_ipfs_storage_path } from "snarkdb/db/index.js";

import fs from 'fs/promises';
import fsExists from 'fs.promises.exists';

export async function init_ipfs_node(address, peerId) {
  const storage_path = get_ipfs_storage_path(address);
  const datastore_path = `${storage_path}/datastore`;
  const blockstore_path = `${storage_path}/blockstore`;
  const datastore = new FsDatastore(datastore_path);
  const blockstore = new FsBlockstore(blockstore_path);

  const libp2p = libp2pDefaults({ peerId: peerId });
  libp2p.addresses.listen = ['/ip4/0.0.0.0/tcp/3027'];
  libp2p.services.pubsub = gossipsub();
  libp2p.datastore = datastore;

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  });
}


export async function init_offline_node() {
  const blockstore = new MemoryBlockstore()
  const datastore = new MemoryDatastore()
  const libp2p = libp2pDefaults()
  return await createHelia({
    datastore,
    blockstore,
    libp2p,
    start: false,
  });
}


export async function compute_cid(path) {
  if (!await fsExists(path)) {
    return null;
  }
  const node = await init_offline_node();
  const unixfs_fs = unixfs(node);
  const is_file = (await fs.lstat(path)).isFile();
  let cid = null;
  if (is_file) {
    const pathParts = path.split('/');
    const filename = pathParts.pop();
    const dirname = pathParts.join('/');
    for await (const entry of unixfs_fs.addAll(globSource(dirname, filename))) {
      if (entry.path === '/' + filename) {
        cid = entry.cid.toString();
        break;
      }
    }
  } else {
    if (!path.endsWith('/')) {
      path = path + '/';
    }
    for await (const entry of unixfs_fs.addAll(globSource(path, '**'))) {
      if (entry.path === '') {
        cid = entry.cid.toString();
        break;
      }
    }
  }
  return cid;
}


export const get_all_remote_files = async (ipfs_fs, path, files) => {
  files = files || [];
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  for await (const file of ipfs_fs.ls(path)) {
    files.push(file);
    file.path = path + file.name;
    file.path = file.path.slice(1);
    if (file.type === 'directory') {
      await get_all_remote_files(ipfs_fs, file.path, files);
    }
  }

  const cid = ipfs_fs.root ? ipfs_fs.root.toString() : null;
  return { files, cid };
}


export const get_all_local_files = async (path) => {
  const files = [];
  const node = await init_offline_node();
  const unixfs_fs = unixfs(node);
  let cid = null;
  if (!path.endsWith('/')) {
    path = path + '/';
  }
  for await (const entry of unixfs_fs.addAll(globSource(path, '**'))) {
    if (entry.path === '') {
      cid = entry.cid.toString();
    }
    files.push(entry);
  }
  return { files, cid };
}


/*
const storage_path = `${process.cwd()}/resources/storage`;
const node = await createNode(storage_path);
const fs = mfs(node)

const encoder = new TextEncoder()
const dir = await fs.mkdir('/test-dir')
console.log({ dir })
const file = await fs.writeBytes(encoder.encode('Hey there ! zefzef'), '/test2/test3/foo.txt')
console.log({ file })

const decoder = new TextDecoder()
for await (const buf of fs.cat('/test-dir/foo.txt')) {
  console.info(decoder.decode(buf))
}
console.log(node.libp2p.getMultiaddrs())
*/


/*
// create two helia nodes
const node1 = await createNode()
const node2 = await createNode()

// connect them together
const multiaddrs = node2.libp2p.getMultiaddrs()
await node1.libp2p.dial(multiaddrs[0])

// create a filesystem on top of Helia, in this case it's UnixFS
const fs = unixfs(node1)

// we will use this TextEncoder to turn strings into Uint8Arrays
const encoder = new TextEncoder()

// add the bytes to your node and receive a unique content identifier
const cid = await fs.addBytes(encoder.encode('Hello World 301'))

console.log('Added file:', cid.toString())

// create a filesystem on top of the second Helia node
const fs2 = unixfs(node2)

// this decoder will turn Uint8Arrays into strings
const decoder = new TextDecoder()
let text = ''

// use the second Helia node to fetch the file from the first Helia node
for await (const chunk of fs2.cat(cid)) {
  text += decoder.decode(chunk, {
    stream: true
  })
}

console.log('Fetched file contents:', text)

*/