const { noise } = await import('@chainsafe/libp2p-noise')
const { yamux } = await import('@chainsafe/libp2p-yamux')
const { unixfs } = await import('@helia/unixfs')
const { bootstrap } = await import('@libp2p/bootstrap')
const { identifyService } = await import('@libp2p/identify')

const { dcutrService } = await import('@libp2p/dcutr')


const { tcp } = await import('@libp2p/tcp')
const { MemoryBlockstore } = await import('blockstore-core')
const { MemoryDatastore } = await import('datastore-core')
const { createHelia, libp2pDefaults } = await import('helia')
const { createLibp2p } = await import('libp2p')
const { ipns } = await import('@helia/ipns')
const { gossipsub } = await import('@chainsafe/libp2p-gossipsub')

const { peerIdFromString } = await import('@libp2p/peer-id')
const { pubsub, helia, } = await import('@helia/ipns/routing')
const { mfs } = await import('@helia/mfs')
const { mplex } = await import('@libp2p/mplex');

//const { webRTC, webRTCDirect } = await import (  '@libp2p/webrtc')
//const { webSockets } = await import (  '@libp2p/websockets')
//const { webTransport } = await import (  '@libp2p/webtransport')

const { ipnsSelector } = await import('ipns/selector')
const { ipnsValidator } = await import('ipns/validator')
const { kadDHT } = await import('@libp2p/kad-dht')
const { autoNATService } = await import('@libp2p/autonat')




async function createNode() {
  // the blockstore is where we store the blocks that make up files
  const blockstore = new MemoryBlockstore()

  // application-specific data lives in the datastore
  const datastore = new MemoryDatastore()

  // libp2p is the networking layer that underpins Helia
  const libp2p = libp2pDefaults()

  libp2p.addresses.listen = ['/ip4/0.0.0.0/tcp/3026']

  libp2p.services.pubsub = gossipsub();
  console.log(libp2p)

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}

const node1 = await createNode()

const { multiaddr } = await import('@multiformats/multiaddr');

await node1.libp2p.dial(multiaddr('/ip4/127.0.0.1/tcp/3027/p2p/12D3KooWQjLr1Dp8dAaGtMsSMLtCyvVT7SrLW9gj7Zr3ksBhs3Zy'));

const fs = mfs(node1);


const name1 = ipns(node1, {
  routers: [
    helia(node1),
    pubsub(node1),
  ]
})
const name2 = ipns(node1)

await name1.resolve(peerIdFromString("12D3KooWQjLr1Dp8dAaGtMsSMLtCyvVT7SrLW9gj7Zr3ksBhs3Zy"))



/*
let text = "";
const decoder = new TextDecoder()
for await (const chunk of fs.unixfs.cat("bafybeid7ywnv5x37hvv4tclwic2xpeydxjnynunzhoanzad7apnk6cy3xy/hello.txt")) {
  text += decoder.decode(chunk, {
    stream: true
  })
}
*/
