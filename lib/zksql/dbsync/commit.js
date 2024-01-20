import {
  execute_offline,
  verify_execution_no_cache,
  verify_execution,
  load_program_keys,
  load_cached_program_source,
} from '../../aleo/proof.js';

import { Table, description_struct_name } from '../../zksql/sql/table.js';

import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'

import { random_from_type, null_value_from_type } from '../../aleo/types/index.js';

import { resources_dir } from '../../utils/index.js';
import { save_object } from '../../utils/fs.js';
import { row_record_name } from '../sql/table.js';


export const table_commit_row = async (
  table_name,
  row_data,
  insert, // = true
  former_state, // = appropriate if unset
  former_index, // = appropriate if unset
) => {
  if (insert == null) insert = true; // default to insert
  const address = global.context.account.address().to_string();

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

  const { outputs } = await execute_offline(
    table_name,
    function_name,
    inputs,
    false,
  );

  const commit = {
    data: insert ? record_to_data(outputs[3].replace(/\s/g, '')) : "",
    hashed_data: outputs[0],
    commit: outputs[2],
    csk: inputs[2],
    state: outputs[1],
    insert: Boolean(insert),
    decoy: false,
  };
  await save_table_commit(
    address,
    table_name,
    commit,
    former_index + 1,
  );

  return commit;
};


export const table_commit_decoy = async (
  table_name,
  former_state, // = appropriate if unset
  former_index, // = appropriate if unset
) => {
  const address = global.context.account.address().to_string();

  if (former_state == null || former_index == null) {
    const table_last_state = await get_table_last_state(
      address, table_name
    );
    former_state = table_last_state.state;
    former_index = table_last_state.index;
  }

  const inputs = [
    former_state,
    random_from_type("scalar")
  ];

  const { outputs } = await execute_offline(
    "utils",
    "commit_state",
    inputs,
    false,
  );

  const commit = {
    commit: outputs[0],
    csk: inputs[1],
    state: former_state,
    decoy: true,
  };
  await save_table_commit(
    address,
    table_name,
    commit,
    former_index + 1,
  );

  return commit;
}


const record_to_data = (record) => {
  const regex = /data:\{([^}]+)\}/;
  const match = record.match(regex);
  if (match && match[1]) {
    return `{${match[1]}}`;
  } else {
    // If no match is found, return an empty string or an appropriate message
    throw new Error('No data fount in record.');
  }
}




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
  const target_csk = await save_relevant_commits(
    request_id, address, table_name, commit_id
  );
  const { state, csk, commit } = await initiate_select_on_commits(
    request_id, address, table_name
  );

  await execute_select_on_commits(
    request_id, address, table_name, target_csk, state, csk, commit
  );
}

const initiate_select_on_commits = async (
  request_id, address, table_name
) => {
  const {
    execution, inputs, outputs
  } = await execute_initiate_select_on_commits();
  await save_execution(
    request_id, address, table_name, 0, execution
  );
  return {
    state: "0field",
    csk: inputs[0],
    commit: outputs[0],
  };
}

const execute_initiate_select_on_commits = async () => {
  const inputs = [random_from_type("scalar"),];
  const { outputs, execution } = await execute_offline(
    "utils",
    "commit_null_state",
    inputs,
    true,
    null,
  );
  return { inputs, outputs, execution };
}


const execute_select_on_commits = async (
  request_id,
  database,
  table_name,
  target_csk,
  initial_state,
  initial_csk,
  initial_commit,
) => {
  let prev_state = initial_state;
  let prev_csk = initial_csk;
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

  const empty_row_data = await get_empty_row_data(database, table_name, table_name);

  let execution_index = 1;
  for (const preparation_index of preparation_indexes) {
    const csk = (
      (preparation_index === -1) ?
        target_csk :
        random_from_type("scalar")
    );
    const preparation_path = `${preparations_dir}/${preparation_index}.json`;
    const preparation_data = await fs.readFile(preparation_path, 'utf8');
    const row_data = JSON.parse(preparation_data);
    const decoy = (row_data === "");

    const execution = await execute_select_on_row(
      request_id,
      decoy ? empty_row_data : row_data,
      csk,
      prev_state,
      prev_csk,
      prev_commit,
      decoy,
    );
    await save_execution(
      request_id, database, table_name, execution_index, execution.execution
    );
    prev_state = execution.outputs[0];
    prev_csk = execution.inputs[1];
    prev_commit = execution.outputs[1];
    execution_index++;
  }
}


const get_empty_row_data = async (database, select_name, table_name) => {
  const { program_code } = await load_cached_program_source(select_name);
  return get_empty_row_data_from_code(database, program_code, table_name);
}


const get_empty_row_data_from_code = (database, program_code, table_name) => {
  const select = Table.from_code(database, program_code);
  const desc_name = description_struct_name(table_name);
  let description_struct = null;
  select.program.structs.forEach(struct => {
    if (desc_name === struct.name) {
      description_struct = struct;
    }
  });
  if (description_struct === null) {
    throw new Error(
      `Description struct ${desc_name} not found in select program.`
    );
  }

  return (
    "{"
    + description_struct
      .fields
      .map(
        (field) => (
          `${field.name}:${null_value_from_type(field.type, "private")}`
        )
      )
      .join(",")
    + "}"
  );
}


const execute_select_on_row = async (
  request_id,
  row_data,
  csk,
  prev_state,
  prev_csk,
  prev_commit,
  decoy,
) => {
  const address = global.context.account.address().to_string();
  const function_name = "process_select";
  const nonce = await random_nonce();

  const row_record = (
    `{owner:${address}.private,data:${row_data},decoy:${decoy}.private,_nonce:${nonce}.public}`
  );
  const inputs = [
    row_record, csk, prev_state, prev_csk, prev_commit, random_from_type("scalar")
  ];

  const { outputs, execution } = await execute_offline(
    request_id,
    function_name,
    inputs,
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
    if (!commit.decoy) {
      const hashed_data = commit.hashed_data;
      if (!commit.insert) {
        deleted.add(hashed_data);
        continue;
      }
      if (deleted.has(hashed_data)) {
        deleted.delete(hashed_data);
        continue;
      }
    }

    await save_request_commit(
      request_id,
      database,
      table_name,
      commit.decoy ? "" : commit.data,
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
  return targeted_commit.csk;
}


export const verify_select_from_commit = async (
  request_id,
  table_name,
  commit_id,
) => {
  try {
    await throw_verify_select_from_commit(request_id, table_name, commit_id);
    return true;
  } catch (error) {
    return false;
  }
}

export const throw_verify_select_from_commit = async (
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

  const init_verif = await verify_execution(
    execution,
    "utils",
    "commit_null_state",
    ["0scalar"],
  )

  if (!init_verif) {
    throw new Error(
      `Initial execution failed verification.`
    );
  }
  let commit = execution.transitions[0].outputs[0].value;

  let process_function_name = "process_select";

  const program_code = await load_cached_program_source(request_id);

  const [
    proving_key,
    verifying_key
  ] = await load_program_keys(
    request_id,
    program_code,
    process_function_name,
    process_select_empty_input(
      address,
      program_code,
      table_name
    ),
    global.context.account.privateKey().to_string(),
  );
  for (const index of other_indexes) {
    const execution_path = `${executions_dir}/${index}.json`;
    const execution_data = await fs.readFile(execution_path, 'utf8');
    const execution = JSON.parse(execution_data);

    const verif = await verify_execution_no_cache(
      execution,
      program_code,
      process_function_name,
      verifying_key,
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

const random_nonce = async () => {
  const program_id = "utils";
  const function_name = "sk_to_pk";
  const inputs = [random_from_type("scalar")];

  const { outputs } = await execute_offline(
    program_id,
    function_name,
    inputs,
    false,
    null,
  );
  return outputs[0];
}


const process_select_empty_input = (
  database, program_code, table_name
) => {
  const address = global.context.account.address().to_string();
  const row_data = get_empty_row_data_from_code(database, program_code, table_name);
  const nonce = "2group";

  const row_record = (
    `{owner:${address}.private,data:${row_data},decoy:true.private,_nonce:${nonce}.public}`
  );
  return [
    row_record,
    "0scalar",
    "0field",
    "0scalar",
    "6483909679030553276222748262902265455236698137743464346806854780005049792424field", // commit null csk on null state
    "0scalar",
  ];
}



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
