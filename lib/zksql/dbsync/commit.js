import {
  execute_offline,
  verify_execution,
  load_or_generate_and_save_program_keys
} from '../../aleo/proof.js';

import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'

import { random_from_type } from '../../aleo/types/integers.js';

import { resources_dir } from '../../utils/index.js';


export const table_commit_row = async (
  table_name,
  row_data,
  insert, // = true
  former_state, // = appropriate if unset
  former_index, // = appropriate if unset
) => {
  if (insert == null) insert = true; // default to insert
  const address = global.context.account.address().to_string();
  const private_key = global.context.account.privateKey().to_string();

  const function_name = insert ? "insert" : "delete";
  if (former_state == null || former_index == null) {
    const table_last_state = await get_table_last_state(
      address, table_name
    );
    former_state = table_last_state.state;
    former_index = table_last_state.index;
  }

  const inputs = [
    row_data,
    former_state,
    random_from_type("scalar")
  ];

  const program_dir = `${resources_dir}/programs/${table_name}`;
  const program_code_path = `${program_dir}/main.aleo`;
  const program_code = await fs.readFile(program_code_path, 'utf8');
  const prover_files_dir = `${program_dir}/build`;

  const [
    proving_key,
    verifying_key
  ] = await load_or_generate_and_save_program_keys(
    program_code,
    function_name,
    inputs,
    private_key,
    prover_files_dir,
  );
  const { outputs } = await execute_offline(
    program_code,
    function_name,
    inputs,
    private_key,
    proving_key,
    verifying_key,
    false,
  );

  const commit = {
    data: insert ? outputs[3].replace(/\s/g, '') : "",
    hashed_data: outputs[0],
    commit: outputs[2],
    cpk: inputs[2],
    state: outputs[1],
    insert: Boolean(insert),
  };
  await save_table_commit(
    address,
    table_name,
    commit,
    former_index + 1,
  );

  return commit;
};



export const save_table_commit = async (
  database,
  table_name,
  commit,
  index
) => {
  const commits_dir = get_table_commits_dir(database, table_name);
  await save_object(
    commits_dir,
    index,
    commit,
  );
}


export const save_object = async (
  dir_path,
  filename,
  commit,
) => {
  const commit_path = `${dir_path}/${filename}.json`;
  const commit_data = JSON.stringify(commit, null, 2);
  if (!await fsExists(dir_path)) {
    await fs.mkdir(dir_path, { recursive: true });
  }
  await fs.writeFile(commit_path, commit_data);
}


export const save_request_commit = async (
  request_id, database, table_name, commit, index
) => {
  const commits_dir = get_select_preparations_dir(
    request_id, database, table_name
  );
  await save_object(
    commits_dir, index, commit,
  );
}


export const get_table_last_state = async (database, table_name) => {
  const default_res = { state: "0field", index: -1 };
  const commits_dir = get_table_commits_dir(database, table_name);
  const commits_dir_exists = await fsExists(commits_dir);
  if (!commits_dir_exists) {
    return default_res;
  }
  const filenames = await fs.readdir(commits_dir);
  const commit_indexes = filenames.map(
    filename => parseInt(filename.split('.')[0])
  ).sort(
    (a, b) => a - b
  );
  if (!commit_indexes.length) {
    return default_res;
  }
  const last_commit_index = commit_indexes.at(-1);
  if (last_commit_index !== commit_indexes.length - 1) {
    throw new Error(
      `Commit IDs are not sequential.`
    );
  }
  const last_commit_path = `${commits_dir}/${last_commit_index}.json`;
  const last_commit_data = await fs.readFile(last_commit_path, 'utf8');
  const last_commit_json = JSON.parse(last_commit_data);
  const last_commit_outputs = last_commit_json.state;
  return {
    state: last_commit_outputs,
    index: last_commit_index,
  };
}

const get_table_dir = (database, table_name) => {
  return `${resources_dir}/databases/${database}/tables/${table_name}`;
}


const get_table_commits_dir = (database, table_name) => {
  return `${get_table_dir(database, table_name)}/commits`;
}

const get_select_preparations_dir = (request_id, database, table_name) => {
  return `${get_table_dir(database, table_name)}/requests/${request_id}/preparations`;
}

const get_select_executions_dir = (request_id, database, table_name) => {
  return `${get_table_dir(database, table_name)}/requests/${request_id}/executions`;
}

export const save_execution = async (
  request_id, database, table_name, index, execution
) => {
  const executions_dir = get_select_executions_dir(
    request_id, database, table_name
  );
  await save_object(
    executions_dir, index, JSON.parse(execution),
  );
}

export const process_select_from_commit = async (
  request_id,
  table_name,
  commit_id,
) => {
  const address = global.context.account.address().to_string();
  const target_cpk = await save_relevant_commits(
    request_id, address, table_name, commit_id
  );
  const { state, cpk, commit } = await initiate_select_on_commits(
    request_id, address, table_name
  );

  await execute_select_on_commits(
    request_id, address, table_name, target_cpk, state, cpk, commit
  );
}

const initiate_select_on_commits = async (
  request_id, address, table_name
) => {
  const {
    execution, inputs, outputs
  } = await execute_initiate_select_on_commits(
    request_id,
  );
  await save_execution(
    request_id, address, table_name, 0, execution
  );
  return {
    state: "0field",
    cpk: inputs[0],
    commit: outputs[0],
  };
}

const execute_initiate_select_on_commits = async (
  request_id,
) => {
  const private_key = global.context.account.privateKey().to_string();
  const function_name = "commit_null_state";

  const inputs = [
    random_from_type("scalar"),
  ];

  const program_dir = `${resources_dir}/programs/${request_id}`;
  const program_code_path = `${program_dir}/main.aleo`;
  const program_code = await fs.readFile(program_code_path, 'utf8');
  const prover_files_dir = `${program_dir}/build`;

  const [
    proving_key,
    verifying_key
  ] = await load_or_generate_and_save_program_keys(
    program_code,
    function_name,
    inputs,
    private_key,
    prover_files_dir,
  );
  const { outputs, execution } = await execute_offline(
    program_code,
    function_name,
    inputs,
    private_key,
    proving_key,
    verifying_key,
    true,
  );

  return { inputs, outputs, execution }
}


const execute_select_on_commits = async (
  request_id,
  database,
  table_name,
  target_cpk,
  initial_state,
  initial_cpk,
  initial_commit,
) => {
  let prev_state = initial_state;
  let prev_cpk = initial_cpk;
  let prev_commit = initial_commit;

  const preparations_dir = get_select_preparations_dir(
    request_id, database, table_name
  );
  const preparations_dir_exists = await fsExists(preparations_dir);
  if (!preparations_dir_exists) {
    throw new Error(`Table ${table_name} has no preparations.`);
  }
  const filenames = await fs.readdir(preparations_dir);
  const preparation_indexes = filenames.map(
    filename => parseInt(filename.split('.')[0])
  ).sort(
    (a, b) => a - b
  );
  let execution_index = 1;
  for (const preparation_index of preparation_indexes) {
    const cpk = (
      (preparation_index === -1) ?
        target_cpk :
        random_from_type("scalar")
    );
    const preparation_path = `${preparations_dir}/${preparation_index}.json`;
    const preparation_data = await fs.readFile(preparation_path, 'utf8');
    const commit = JSON.parse(preparation_data);

    const execution = await execute_select_on_row(
      request_id,
      commit.data,
      cpk,
      prev_state,
      prev_cpk,
      prev_commit,
    );
    await save_execution(
      request_id, database, table_name, execution_index, execution.execution
    );
    prev_state = execution.outputs[0];
    prev_cpk = execution.inputs[1];
    prev_commit = execution.outputs[1];
    execution_index++;
  }
}


const execute_select_on_row = async (
  request_id,
  row_record,
  cpk,
  prev_state,
  prev_cpk,
  prev_commit,
) => {
  const private_key = global.context.account.privateKey().to_string();
  const function_name = "process_select";

  const inputs = [
    row_record, cpk, prev_state, prev_cpk, prev_commit,
  ];

  const program_dir = `${resources_dir}/programs/${request_id}`;
  const program_code_path = `${program_dir}/main.aleo`;
  const program_code = await fs.readFile(program_code_path, 'utf8');
  const prover_files_dir = `${program_dir}/build`;

  const [
    proving_key,
    verifying_key
  ] = await load_or_generate_and_save_program_keys(
    program_code,
    function_name,
    inputs,
    private_key,
    prover_files_dir,
  );
  const { outputs, execution } = await execute_offline(
    program_code,
    function_name,
    inputs,
    private_key,
    proving_key,
    verifying_key,
    true,
  );

  return { inputs, outputs, execution };
}


const save_relevant_commits = async (
  request_id,
  database,
  table_name,
  commit_id,
) => {
  const commits_dir = get_table_commits_dir(database, table_name);
  const commits_dir_exists = await fsExists(commits_dir);
  if (!commits_dir_exists) {
    throw new Error(
      `Table ${table_name} has no commits.`
    );
  }
  const filenames = await fs.readdir(commits_dir);
  const commit_indexes = filenames.map(
    filename => parseInt(filename.split('.')[0])
  ).sort(
    (a, b) => b - a
  );
  let targeted_commit = null;
  const deleted = new Set();
  let i = 1;

  for (const commit_index of commit_indexes) {
    const commit_path = `${commits_dir}/${commit_index}.json`;
    const commit_data = await fs.readFile(commit_path, 'utf8');
    const commit = JSON.parse(commit_data);
    if (targeted_commit === null && commit_id === commit.commit) {
      targeted_commit = commit;
    }
    if (targeted_commit === null) {
      continue;
    }
    const hashed_data = commit.hashed_data;
    if (!commit.insert) {
      deleted.add(hashed_data);
      continue;
    }
    if (deleted.has(hashed_data)) {
      deleted.delete(hashed_data);
      continue;
    }
    await save_request_commit(
      request_id,
      database,
      table_name,
      { data: commit.data },
      `-${i}`
    );
    i++;
  }

  if (deleted.size) {
    throw new Error(
      `A deleted row was never inserted.`
    );
  }
  if (targeted_commit === null) {
    throw new Error(
      `Commit ${commit_id} not found.`
    );
  }
  return targeted_commit.cpk;
}


export const verify_select_from_commit = async (
  request_id,
  table_name,
  commit_id,
) => {
  const address = global.context.account.address().to_string();
  const executions_dir = get_select_executions_dir(
    request_id, address, table_name
  );
  const executions_dir_exists = await fsExists(executions_dir);
  if (!executions_dir_exists) {
    throw new Error(`Request '${request_id}' has no executions.`);
  }
  const filenames = await fs.readdir(executions_dir);
  const execution_indexes = filenames.map(
    filename => parseInt(filename.split('.')[0])
  ).sort(
    (a, b) => a - b
  );
  if (!execution_indexes.length) {
    throw new Error(`Request '${request_id}' has no executions.`);
  }
  const [init_index, ...other_indexes] = execution_indexes;

  const execution_path = `${executions_dir}/${init_index}.json`;
  const execution_data = await fs.readFile(execution_path, 'utf8');
  const execution = JSON.parse(execution_data);


  const program_dir = `${resources_dir}/programs/${request_id}`;
  const program_code_path = `${program_dir}/main.aleo`;
  const program_code = await fs.readFile(program_code_path, 'utf8');
  const prover_files_dir = `${program_dir}/build`;
  const [
    init_proving_key,
    init_verifying_key
  ] = await load_or_generate_and_save_program_keys(
    program_code,
    "commit_null_state",
    ["0scalar"],
    global.context.account.privateKey().to_string(),
    prover_files_dir,
  );
  const init_verif = await verify_execution(
    JSON.stringify(execution),
    init_verifying_key,
    program_code,
    "commit_null_state",
  );
  if (!init_verif) {
    throw new Error(
      `Initial execution failed verification.`
    );
  }
  let commit = execution.transitions[0].outputs[0].value;

  let process_function_name = "process_select";
  const [
    proving_key,
    verifying_key
  ] = await load_or_generate_and_save_program_keys(
    program_code,
    process_function_name,
    aleo_function_empty_input(program_code, process_function_name),
    global.context.account.privateKey().to_string(),
    prover_files_dir,
  );
  for (const index of other_indexes) {
    const execution_path = `${executions_dir}/${index}.json`;
    const execution_data = await fs.readFile(execution_path, 'utf8');
    const execution = JSON.parse(execution_data);

    const verif = await verify_execution(
      JSON.stringify(execution),
      verifying_key,
      program_code,
      process_function_name,
    );
    if (!verif) {
      throw new Error(
        `Execution at index '${index}' failed verification.`
      );
    }
    if (execution.transitions[0].inputs[4].value !== commit) {
      throw new Error(
        `Commit chain breaks at index '${index}'.`
      );
    }
    commit = execution.transitions[0].outputs[1].value;
  }

  if (commit !== commit_id) {
    throw new Error(
      `Final commit does not match requested commit '${commit_id}'.`
    );
  }
}


const aleo_function_empty_input = (program_code, function_name) => {
  return [
    "{owner:aleo1wamjqlka7d0gazlxdys6n8e8zeee3ymedwvw8elvh7529kwd45rq0plgax.private,data:{col_2_1:0field.private,col_2_2:0field.private,col_2_3:false.private},_nonce:4282728649827810496298484047873544676670239034939807580993554961150683729551group.public}",
    "0field",
    random_from_type("scalar")
  ];
  /*
      * const expected_inputs = [
    *     {
    *       type:"record",
    *       visibility:"private",
    *       record:"credits",
    *       members:[
    *         {
    *           name:"microcredits",
    *           type:"u64",
    *           visibility:"private"
    *         }
    *       ],
    *       register:"r0"
    *     },
    *     {
    *       type:"address",
    *       visibility:"private",
    *       register:"r1"
    *     },
    *     {
    *       type:"u64",
    *       visibility:"private",
    *       register:"r2"
    *     }
    * ];
    *
    * const credits_program = aleo_wasm.Program.getCreditsProgram();
    * const transfer_function_inputs = credits_program.getFunctionInputs("transfer_private");
    * console.log(transfer_function_inputs === expected_inputs); // Output should be "true"
    * 
    * 
  return programManager.getFunctionInputs(
    program_code,
    function_name,
    []
    );
    */
}