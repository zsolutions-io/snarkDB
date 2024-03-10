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

const remove_name = "check";
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

const display_account = ({ account, ipfs, mnemonic }) => {
  console.log();
  console.log(`     Mnemonic`.bold.cyan + `\t${mnemonic}`);
  console.log();
  console.log(`      Peer Id`.bold.cyan + `\t${String(ipfs)}`);
  console.log();
  console.log(`  Private Key`.bold.cyan + `\t${account.privateKey().to_string()}`);
  console.log(`     View Key`.bold.cyan + `\t${account.viewKey().to_string()}`);
  console.log(`      Address`.bold.cyan + `\t${account.address().to_string()}`);
  console.log();
};


export default {
  name,
  description,
  pattern,
  entrypoint
}

