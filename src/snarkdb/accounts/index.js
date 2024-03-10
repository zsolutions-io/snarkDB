import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { createFromPrivKey } from '@libp2p/peer-id-factory';
import { unmarshalPrivateKey, generateKeyPairFromSeed } from '@libp2p/crypto/keys';

import { Account } from "@aleohq/sdk";
import bip39 from 'bip39';
import { bytesToHex } from 'utils/strings.js'


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