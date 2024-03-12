import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { createFromPrivKey } from '@libp2p/peer-id-factory';
import { unmarshalPrivateKey, generateKeyPairFromSeed } from '@libp2p/crypto/keys';

import { Account } from "@aleohq/sdk";
import bip39 from 'bip39';
import { bytesToHex } from 'utils/strings.js'

import { bech32m } from "bech32";
import bs58 from 'bs58';


export async function snarkdb_account(mnemonic) {
  if (mnemonic == null) mnemonic = bip39.generateMnemonic();

  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic).slice(0, 32);
  const ipfs_key_pair = await generateKeyPairFromSeed("Ed25519", seed,);
  const snarkvm_account = new Account({ seed: seed });
  const ipfs_private_key_hex = "08011240" + bytesToHex(ipfs_key_pair._key)
  const encoded = uint8ArrayFromString(ipfs_private_key_hex, 'hex')
  const privateKey = await unmarshalPrivateKey(encoded)
  const peerId = await createFromPrivKey(privateKey)
  return {
    ipfs: peerId,
    account: snarkvm_account,
    mnemonic,
  };
}


export async function snarkdb_account(mnemonic) {
  if (mnemonic == null) mnemonic = bip39.generateMnemonic();

  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic).slice(0, 32);
  const ipfs_key_pair = await generateKeyPairFromSeed("Ed25519", seed,);
  const snarkvm_account = new Account({ seed: seed });
  const ipfs_private_key_hex = "08011240" + bytesToHex(ipfs_key_pair._key)
  const encoded = uint8ArrayFromString(ipfs_private_key_hex, 'hex')
  const privateKey = await unmarshalPrivateKey(encoded)
  const peerId = await createFromPrivKey(privateKey)
  return {
    ipfs: peerId,
    account: snarkvm_account,
    mnemonic,
  };
}


const { bech32m } = await import("bech32");
const bs58 = (await import('bs58')).default;

function bytesToWords(bytes) {
  return bech32m.toWords(Buffer.from(bytes));
}

function wordsToBytes(words) {
  return new Uint8Array(bech32m.fromWords(words));
}

function bs58ToBytes(input) {
  return new Uint8Array(bs58.decode(input));
}

function bytesToBs58(bytes) {
  return bs58.encode(Buffer.from(bytes));
}


function snarkdb_id_to_addresses(snarkdb_id) {
  const { prefix, words } = bech32m.decode(snarkdb_id, 121);
  if (prefix != "db") {
    throw new Error("Invalid SnarkDB ID");
  }
  console.log(words)
  const aleo_bytes = wordsToBytes(words.slice(0, 32));
  const ipfs_bytes = wordsToBytes(words.slice(32, words.length));
  const aleo_address = bech32m.encode("aleo", bytesToWords(aleo_bytes));
  const ipfs_peer_id = bytesToBs58(ipfs_bytes);
  return { aleo_address, ipfs_peer_id };
}

function addresses_to_snarkdb_id(aleo_address, ipfs_peer_id) {
  const { prefix: aleo_prefix, words: aleo_words } = bech32m.decode(aleo_address);
  if (aleo_prefix != "aleo") {
    throw new Error("Invalid Aleo address");
  }
  const aleo_bytes = wordsToBytes(aleo_words);
  const ipfs_bytes = bs58ToBytes(ipfs_peer_id);

  console.log(aleo_bytes, ipfs_bytes)

  const bytes = new Uint8Array([...aleo_bytes, ...ipfs_bytes]);
  return bech32m.encode("db", bytesToWords(bytes), 121);
  //return bytesToBs58(bytes);
}

const aleo = "aleo15a8dsha6tse84xkslldwkql3dvn8qtz6pnwq500qars6ecwduvzqzs8644";
const ipfs = "12D3KooWQjLr1Dp8dAaGtMsSMLtCyvVT7SrLW9gj7Zr3ksBhs3Zy";

const res = addresses_to_snarkdb_id(aleo, ipfs);
snarkdb_id_to_addresses(res)

