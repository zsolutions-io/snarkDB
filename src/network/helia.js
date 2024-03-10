import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { tcp } from '@libp2p/tcp';
import { FsBlockstore } from 'blockstore-fs';
import { FsDatastore } from 'datastore-fs';
import { createHelia } from 'helia';
import { createLibp2p } from 'libp2p';

import { mfs } from '@helia/mfs';
import { get_ipfs_storage_path } from "snarkdb/db/index.js";


export async function init_ipfs_node(address, peerId) {
  const storage_path = get_ipfs_storage_path(address);
  const datastore_path = `${storage_path}/datastore`;
  const blockstore_path = `${storage_path}/blockstore`;
  const datastore = new FsDatastore(datastore_path);
  const blockstore = new FsBlockstore(blockstore_path);

  const libp2p = await createLibp2p({
    peerId,
    datastore,
    addresses: {
      listen: [
        `/ip4/127.0.0.1/tcp/${process.env.SNARKDB_PORT}` //'/ip4/127.0.0.1/tcp/0'
      ]
    },
    transports: [
      tcp()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
        ]
      })
    ],
    services: {
      identify: identify()
    }
  });

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  });
}


/*
const storage_path = `${process.cwd()}/resources/storage`;
const node = await createNode(storage_path);
const fs = mfs(node)

const encoder = new TextEncoder()
const dir = await fs.mkdir('/test-dir')
console.log({ dir })
const file = await fs.writeBytes(
  encoder.encode('Hey there !'), '/test-dir/foo.txt'
)
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