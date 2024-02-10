import yargs from "yargs/yargs.js";
import {
  display_error
} from "utils/index.js";

import {
  Account,
  AleoKeyProvider,
  AleoNetworkClient,
  NetworkRecordProvider,
  ProgramManager,
  initThreadPool
} from "@aleohq/sdk";


import fs from 'fs/promises';

import command_info from './command_info.js';
import { get_help_message } from './help.js';
import commands from './commands/index.js';

import dotenv from 'dotenv';
import { resources_dir } from 'utils/index.js';

import path from 'path';
import { root_path } from 'utils/index.js';

import colors from 'colors';

dotenv.config({ path: path.resolve(root_path, '.env.local') });
dotenv.config({ path: path.resolve(root_path, '.env') });


const load_context = async (argv) => {
  let context = {};
  const endpoint = argv?.endpoint ? argv.endpoint : process.env.NETWORK_API_URL;
  context.endpoint = endpoint;
  try {
    const account =
      argv?.privateKey ?
        new Account({ privateKey: argv.privateKey })
        : process.env.PRIVATE_KEY ?
          new Account({ privateKey: process.env.PRIVATE_KEY })
          : null;
    const verbosity =
      argv?.verbosity ?
        Number(argv.verbosity)
        : process.env.VERBOSITY ?
          Number(process.env.VERBOSITY)
          : 1;
    const package_version = await load_package_version();
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    const networkClient = new AleoNetworkClient(endpoint);
    const recordProvider = new NetworkRecordProvider(account, networkClient);
    //await initThreadPool();
    const programManager = new ProgramManager(endpoint, keyProvider, recordProvider);
    programManager.setAccount(account);
    programManager.networkClient.fs = fs;
    programManager.networkClient.resources_dir = resources_dir;

    context = {
      ...context,
      package_version,
      account,
      verbosity,
      keyProvider,
      networkClient,
      recordProvider,
      programManager
    };

  } catch (e) {
    throw new Error("Failed to load private key.")
  }
  if (!context.account)
    throw new Error("No private key provided. Use --privateKey or set PRIVATE_KEY env variable.")

  global.context = context;
}

async function load_package_version() {
  const package_path = path.resolve(root_path, 'package.json');
  const package_json = JSON.parse(
    await fs.readFile(package_path, 'utf-8')
  );
  return package_json.version;
}


const actions = Object.values(commands);
const {
  program_name,
  usage_description,
  args_pattern,
  description,
  optional_args
} = command_info;

const help_message = get_help_message(actions, args_pattern, description);
const action_names = Object.values(actions).map((({ name }) => name));


const default_entrypoint = (argv) => {
  if (!action_names.includes(argv?._?.[0])) {
    return console.log(help_message);
  }
};


let result = await yargs(process.argv.slice(2))
  .command(
    '$0', 'help', () => { }, default_entrypoint
  ).scriptName(`${usage_description}\n  ${program_name.bold.green}`)
  ;


for (const command of Object.values(commands)) {
  const entrypoint = async (argv) => {
    argv = await argv;
    await load_context(argv);
    try {
      await command.entrypoint(argv);
      process.exit(0);
    } catch (e) {
      display_error(e);
      process.exit(1);
    }
  };
  const opts = optional_args.concat(
    command.optional_args || []
  );
  const builder = Object.fromEntries(
    opts.map(
      ({ name, description, type }) => [
        name, {
          describe: description,
          type,
          demandOption: false,
        }
      ]
    )
  )
  const help = `${"Description:".yellow.bold}\n  ${command.description}`;

  result = await result.command({
    command: command.pattern,
    describe: help,
    builder,
    handler: entrypoint
  });
}


export const argv = await result.argv;
