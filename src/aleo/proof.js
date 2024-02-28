import {
  ProgramManager
} from '@aleohq/sdk';

import crypto from 'crypto';

import { Program } from '../aleo/program.js';

import {
  Execution,
  initThreadPool,
  verifyFunctionExecution,
  verifyFunctionExecutionImports,
  ProvingKey,
  VerifyingKey,
  PrivateKey,
} from '@aleohq/wasm';


import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'

import { programs_to_copy } from '../utils/index.js';
import {
  get_resources_program_dir_path,
  get_program_dir_path
} from 'snarkdb/db/index.js';

export async function load_cached_program_source(
  program_id
) {
  const copy_from_program_dir_if_not_exist = programs_to_copy.includes(program_id);
  const program_dir = get_program_dir_path(program_id);
  const resources_program_dir = get_resources_program_dir_path(program_id);

  const program_dir_exists = await fsExists(resources_program_dir);
  const program_code_path = `${resources_program_dir}/main.aleo`;
  if (!program_dir_exists && !copy_from_program_dir_if_not_exist) {
    throw `Program ${JSON.stringify(program_id)} not found.`;
  }
  if (!program_dir_exists) {
    const from_code_path = `${program_dir}/main.aleo`;
    await fs.mkdir(resources_program_dir, { recursive: true });
    await fs.copyFile(from_code_path, program_code_path);
  }

  const program_code = await fs.readFile(program_code_path, 'utf8');
  return program_code;
}

export async function execute_offline(
  program_id,
  function_name,
  inputs,
  prove_execution, // optional
  private_key, // optional
) {
  if (private_key == null)
    private_key = global.context.account.privateKey().to_string();
  if (prove_execution == null)
    prove_execution = false;
  const program_code = await load_cached_program_source(program_id);

  const [
    proving_key,
    verifying_key
  ] = await load_program_keys(
    program_id,
    program_code,
    function_name,
    inputs,
    private_key,
  );
  const { outputs, execution } = await execute_offline_no_cache(
    program_code,
    function_name,
    inputs,
    private_key,
    proving_key,
    verifying_key,
    prove_execution,
  );
  console.log({ inputs, outputs, execution })
  return { outputs, execution }
};


export async function execute_offline_no_cache(
  program_code,
  function_name,
  inputs,
  private_key,
  proving_key,
  verifying_key,
  prove_execution,
  offlineQuery = undefined
) {
  if (prove_execution == null)
    prove_execution = false;
  try {
    const imports = await global.context.programManager.networkClient.getProgramImports(
      program_code
    );
    if (imports instanceof Error) {
      throw "Error getting program imports";
    }

    const response = await global.context.programManager.run(
      program_code,
      function_name,
      inputs,
      prove_execution,
      imports,
      undefined,
      proving_key.copy(),
      verifying_key.copy(),
      PrivateKey.from_string(private_key),
      offlineQuery
    );
    const outputs = response.getOutputs();
    const executionObj = response.getExecution();
    let execution = executionObj ? executionObj.toString() : "";

    return { outputs, execution };
  }
  catch (error) {
    console.error(error);
    throw "" + (error ? error.toString() : "Unknown error");
  }
}



export async function verify_execution(
  execution,
  program_id,
  function_name,
  example_inputs,
) {

  const program_code = await load_cached_program_source(
    program_id
  );

  const [
    _,
    verifying_key
  ] = await load_program_keys(
    program_id,
    program_code,
    function_name,
    example_inputs,
    global.context.account.privateKey().to_string(),
  );

  const valid_proof = await verify_execution_no_cache(
    execution,
    program_code,
    function_name,
    verifying_key,
  );

  return valid_proof;
}


export async function verify_execution_no_cache(
  execution,
  program_code,
  function_name,
  verifying_key,
) {
  try {
    const program = global.context.programManager.createProgramFromSource(program_code);
    if (program instanceof Error) {
      throw "Error creating program from source";
    }

    const imports = await global.context.programManager.networkClient.getProgramImports(
      program_code
    );
    const transition = execution.transitions[0];
    if (transition.program.split(".")[0] !== program.id().split(".")[0])
      throw "Program ID mismatch";
    if (transition.function !== function_name)
      throw "Function name mismatch";

    const valid_proof = verifyFunctionExecutionImports(
      Execution.fromString(JSON.stringify(execution)),
      verifying_key.copy(),
      program,
      function_name,
      imports
    );

    return valid_proof;
  }
  catch (error) {
    console.error(error);
    throw "" + (error ? error.toString() : "Unknown error");
  }
}


export async function generate_program_keys(
  program_source,
  function_name,
  inputs,
  private_key,
) {
  return await global.context.programManager.synthesizeKeys(
    program_source,
    function_name,
    inputs,
    PrivateKey.from_string(private_key)
  );
}


export async function load_program_keys_from_files(
  program_id,
  function_name,
) {
  const program_dir = get_resources_program_dir_path(program_id);
  const proving_path = `${program_dir}/${function_name}.prover`;
  const verifying_path = `${program_dir}/${function_name}.verifier`;

  const proving_key = ProvingKey.fromBytes(
    new Uint8Array(await fs.readFile(proving_path))
  );
  const verifying_key = VerifyingKey.fromBytes(
    new Uint8Array(await fs.readFile(verifying_path))
  );

  return [proving_key, verifying_key];
}



const program_function_paths = (program_id, function_name) => {
  const program_dir = get_resources_program_dir_path(program_id);
  const proving_path = `${program_dir}/${function_name}.prover`;
  const verifying_path = `${program_dir}/${function_name}.verifier`;
  const cache_path = `${program_dir}/${function_name}.hash`;
  return { proving_path, verifying_path, cache_path };
}


const previous_program_cache_hash = async (program_id, function_name) => {
  const { proving_path, verifying_path, cache_path } = program_function_paths(
    program_id, function_name
  );

  const proving_path_exists = await fsExists(proving_path);
  const verifying_path_exists = await fsExists(verifying_path);
  const cache_path_path_exists = await fsExists(cache_path);

  if (proving_path_exists && verifying_path_exists && cache_path_path_exists) {
    return await fs.readFile(cache_path, 'utf8');
  }
  return null;
}


const MAX_DEPTH = 50;

const program_cache_hash = async (
  program_id, program_source, depth
) => {
  if (depth == null)
    depth = 0;
  if (depth > MAX_DEPTH)
    throw "Too many imports";
  if (program_source == null)
    program_source = await load_cached_program_source(program_id);
  const program = Program.from_code(program_source);
  let program_hash = hash_str(program_source);
  for (const imp of program.imports) {
    const import_cache_hash = await program_cache_hash(
      imp.name, null, depth + 1
    );
    program_hash += import_cache_hash;
    program_hash = hash_str(program_hash)
  }
  return program_hash;
}


export async function load_program_keys(
  program_id,
  program_source,
  function_name,
  inputs,
  proving_private_key,
  load_from_cache,
  save_to_cache,
) {
  if (load_from_cache == null) load_from_cache = true;
  if (save_to_cache == null) save_to_cache = true;
  if (typeof inputs === 'function') {
    inputs = await inputs();
  }

  const next_cache = await program_cache_hash(program_id, program_source);
  const previous_cache = await previous_program_cache_hash(
    program_id, function_name
  );
  const same_cache = (previous_cache === next_cache);
  if (same_cache) {
    return await load_program_keys_from_files(
      program_id, function_name
    );
  }
  const [proving_key, verifying_key] = await generate_program_keys(
    program_source,
    function_name,
    inputs,
    proving_private_key
  );

  if (save_to_cache && !same_cache) {
    const program_dir = get_resources_program_dir_path(program_id);
    const prover_dir_exists = await fsExists(program_dir);
    if (!prover_dir_exists)
      await fs.mkdir(program_dir, { recursive: true });
    const { proving_path, verifying_path, cache_path } = program_function_paths(
      program_id, function_name
    );
    await fs.writeFile(proving_path, proving_key.toBytes());
    await fs.writeFile(verifying_path, verifying_key.toBytes());
    await fs.writeFile(cache_path, next_cache);
  }
  return [proving_key, verifying_key];
}


export const hash_str = (source) => {
  const hash = crypto.createHash('sha256');
  hash.update(source);
  return hash.digest('hex');
}


