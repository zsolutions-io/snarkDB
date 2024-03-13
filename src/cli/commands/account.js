import { get_help_message } from "../help.js"
import {
  snarkdb_account
} from "snarkdb/accounts/index.js";

const name = "account";

const add_name = "new";
const add_args = [];
const add_pattern = `${name} ${add_name} [OPTIONS]`;
const add_description = `Create a new snarkdb account.`;
const add_help = get_help_message(null, add_pattern, add_description, add_args);

const remove_name = "test";
const remove_args = [];
const remove_pattern = `${name} ${remove_name} [OPTIONS]`;
const remove_description = `Reveal active account informations.`;
const remove_help = get_help_message(null, remove_pattern, remove_description, remove_args);


const description = `Manage snarkDB cryptographic keys.`;
const _pattern = `${name} <SUBCOMMAND> [OPTIONS]`;
const pattern = `${name} [SUBCOMMAND] [OPTIONS]`;


const actions = [
  {
    name: add_name,
    description: add_description
  },
  {
    name: remove_name,
    description: remove_description
  },
];

const entrypoint = async (args) => {
  const { SUBCOMMAND: subcommand } = args;
  if (subcommand === add_name) {
    return await account_new();
  } else if (subcommand === remove_name) {
    return await account_check();
  }
  console.log(get_help_message(actions, _pattern, description, null));
};


const account_check = async () => {
  const snarkdb = await snarkdb_account(global.context.mnemonic);
  display_account(snarkdb);
};


const account_new = async () => {
  const snarkdb = await snarkdb_account();
  display_account(snarkdb);
};

const display_account = ({ account, ipfs, mnemonic, snarkdb_id }) => {
  console.log();
  console.log(`  SnarkDB`.bold.yellow);
  console.log(`    Mnemonic\n`.bold.cyan + `      ${mnemonic}`);
  console.log(`    SnarkDB Id\n`.bold.cyan + `      ${String(snarkdb_id)}`);
  console.log();
  console.log(`  IPFS`.bold.yellow);
  console.log(`    Peer Id\n`.bold.cyan + `      ${String(ipfs.peerId)}`);
  console.log(`    Pirivate Key\n`.bold.cyan + `      ${String(ipfs.privateKey)}`);
  console.log();
  console.log(`  SnarkVM`.bold.yellow);
  console.log(`    Pirivate Key\n`.bold.cyan + `      ${account.privateKey().to_string()}`);
  console.log(`    View Key\n`.bold.cyan + `      ${account.viewKey().to_string()}`);
  console.log(`    Address\n`.bold.cyan + `      ${account.address().to_string()}`);
  console.log();
};


export default {
  name,
  description,
  pattern,
  entrypoint
}

