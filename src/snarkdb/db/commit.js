import {
  execute_offline,
  verify_execution_no_cache,
  verify_execution,
  load_program_keys,
  load_cached_program_source,
} from 'aleo/proof.js';

import { get_table_commit_rows_dir, get_table_commit_dir } from 'snarkdb/db/index.js';

import { Table, description_struct_name } from 'snarkdb/sql/table.js';


import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'

import { random_from_type, null_value_from_type, parse_record } from 'aleo/types/index.js';

import { save_object } from 'utils/index.js';
import shuffle from 'crypto-shuffle';
import crypto from 'crypto';


const commit_data_filename = "data";



export const save_commit_data_from_id = async (database, table, commit_id, commit_data) => {
  const commit_dir = get_table_commit_dir(database, table, commit_id);
  await save_object(commit_dir, "data", commit_data);
}

export const get_commit_data_from_id = async (database, table, commit_id) => {
  const commit_dir = get_table_commit_dir(database, table, commit_id);
  const commit_path = `${commit_dir}/${commit_data_filename}.json`;
  const commit_data = await fs.readFile(commit_path, 'utf8');
  return JSON.parse(commit_data);
}

export const save_commit_row = async (database, table, commit_id, row_id, row) => {
  const commit_dir = get_table_commit_rows_dir(database, table, commit_id);
  await save_object(commit_dir, row_id, row);
}


export const table_insert_row = async (
  table_name,
  row_data,
  primary_key,
) => {
  if (primary_key == null) primary_key = false;

  const file_name =
    primary_key ?
      get_hash_of_primary_value(primary_key, row_data) :
      crypto.randomUUID().replaceAll("-", "");

  const address = global.context.account.address().to_string();

  await save_table_row(
    address,
    table_name,
    row_data,
    file_name,
  );

  return row_data;
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

export const save_table_row = async (
  database,
  table_name,
  commit,
  index
) => {
  const commits_dir = get_table_current_dir(database, table_name);
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


export const save_request_results = async (
  request_id, result, index
) => {
  const results_dir = get_select_results_dir(
    request_id,
  );
  await save_object(
    results_dir, index, result,
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
  table,
  req_commit,
) => {
  const address = global.context.account.address().to_string();

  if (table.database !== address) {
    throw new Error(
      `Your address '${address}' is different from query database '${table.database}'.`
    );
  }

  const target_csk = await save_relevant_commits(
    request_id, address, table.name, req_commit.id
  );
  const { state, csk, commit } = await initiate_select_on_commits(
    request_id, address, table.name
  );

  await execute_select_on_commits(
    request_id, address, table, target_csk, state, csk, commit, req_commit,
  );
}


export const process_select_from_select = async (
  request_id,
  from_table,
  from_table_last_from_table
) => {
  const address = global.context.account.address().to_string();
  if (from_table.database !== address) {
    throw new Error(
      `Your address '${address}' is different from query database '${from_table.database}'.`
    );
  }

  const { state, csk, commit } = await initiate_select_on_commits(
    request_id, address, from_table.name
  );
  await execute_select_on_select(
    request_id, address, from_table.name, from_table_last_from_table, state, csk, commit
  );
}


const execute_select_on_select = async (
  request_id,
  database,
  from_request_id,
  last_from_table,
  initial_state,
  initial_csk,
  initial_commit,
) => {
  let prev_state = initial_state;
  let prev_csk = initial_csk;
  let prev_commit = initial_commit;

  const executions_dir = get_select_executions_dir(
    from_request_id, last_from_table.database, last_from_table.name
  );
  const executions_dir_exists = await fsExists(executions_dir);
  if (!executions_dir_exists) {
    throw new Error(`Request '${from_request_id}' has no executions.`);
  }
  const execution_filenames = await fs.readdir(executions_dir);
  const execution_indexes = execution_filenames.map(
    filename => parseInt(filename.split('.')[0])
  ).sort(
    (a, b) => a - b
  );
  execution_indexes.shift();

  for (const execution_index of execution_indexes) {
    const csk = random_from_type("scalar");

    const preparation_path = `${executions_dir}/${execution_index}.json`;
    const preparation_data = await fs.readFile(preparation_path, 'utf8');
    const last_execution = JSON.parse(preparation_data);

    const record_ciphertext = last_execution.transitions[0].outputs[2].value;
    const row_record = global.context.account.decryptRecord(record_ciphertext);

    const execution = await execute_select_on_row(
      request_id,
      row_record,
      csk,
      prev_state,
      prev_csk,
      prev_commit,
    );
    await save_execution(
      request_id, database, from_request_id, execution_index, execution.execution
    );
    prev_state = execution.outputs[0];
    prev_csk = execution.inputs[1];
    prev_commit = execution.outputs[1];
  }
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
  table,
  target_csk,
  initial_state,
  initial_csk,
  initial_commit,
  final_commit
) => {
  let prev_state = initial_state;
  let prev_csk = initial_csk;
  let prev_commit = initial_commit;

  const preparations_dir = get_select_preparations_dir(
    request_id, database, table.name
  );
  const preparations_dir_exists = await fsExists(preparations_dir);
  if (!preparations_dir_exists) {
    throw new Error(`Table ${table.name} has no preparations.`);
  }
  const filenames = await fs.readdir(preparations_dir);
  const preparation_former_indexes = filenames.map(
    filename => parseInt(filename.split('.')[0])
  ).sort(
    (a, b) => a - b
  );

  const preparation_amount = preparation_former_indexes.length;
  const expected_commit_amount = final_commit.index * table.settings.max_new_rows_per_push;
  const decoy_amount = expected_commit_amount - preparation_amount;


  if (decoy_amount < 0) {
    throw new Error(
      `Too many new values for commit '${final_commit.id}'.`
    );
  }
  const new_indexes = ([...Array(expected_commit_amount).keys()]).map((x) => (x + 1));
  shuffle(new_indexes);
  const preparation_new_indexes = new_indexes
    .slice(0, preparation_amount)
    .sort(
      (a, b) => a - b
    );

  const empty_row_data = await get_empty_row_data(database, request_id, table.name, "private");

  let preparation_index = 0;
  for (
    let execution_index = 1;
    execution_index < expected_commit_amount + 1;
    execution_index++
  ) {
    const last_execution = (execution_index === expected_commit_amount);
    const csk = last_execution ? target_csk : random_from_type("scalar");
    const preparation_new_index = preparation_new_indexes[preparation_index];
    const decoy = (preparation_new_index !== execution_index);
    let row_data = empty_row_data;
    if (!decoy) {
      const preparation_former_index = preparation_former_indexes[preparation_index];
      const preparation_path = `${preparations_dir}/${preparation_former_index}.json`;
      const preparation_data = await fs.readFile(preparation_path, 'utf8');
      row_data = JSON.parse(preparation_data);
      preparation_index++;
    }
    const nonce = await random_nonce();

    const row_record = (
      `{owner:${database}.private,data:${row_data},decoy:${decoy}.private,_nonce:${nonce}.public}`
    );

    const execution = await execute_select_on_row(
      request_id,
      row_record,
      csk,
      prev_state,
      prev_csk,
      prev_commit,
    );
    await save_execution(
      request_id, database, table.name, execution_index, execution.execution
    );
    prev_state = execution.outputs[0];
    prev_csk = execution.inputs[1];
    prev_commit = execution.outputs[1];
  }
}


const get_empty_row_data = async (database, select_name, table_name, visibility) => {
  const program_code = await load_cached_program_source(select_name);
  return get_empty_row_data_from_code(database, program_code, table_name, visibility);
}


const get_empty_row_data_from_code = (database, program_code, table_name, visibility) => {
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

  return empty_struct_data(description_struct, visibility);
}

export const empty_struct_data = (struct, visibility) => {
  return (
    "{"
    + struct
      .fields
      .map(
        (field) => (
          `${field.name}:${null_value_from_type(field.type, visibility)}`
        )
      )
      .join(",")
    + "}"
  );
}


const execute_select_on_row = async (
  request_id,
  row_record,
  csk,
  prev_state,
  prev_csk,
  prev_commit,
) => {
  const inputs = [
    row_record, csk, prev_state, prev_csk, prev_commit, random_from_type("scalar")
  ];
  const function_name = "process_select";

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
    if (commit.decoy) {
      continue
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
      commit.data,
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
  from_table,
  commit_id,
) => {
  try {
    await throw_verify_select(request_id, from_table, commit_id);
    return true;
  } catch (error) {
    return false;
  }
}


export const verify_select_from_select = async (
  request_id,
  from_table,
  last_from_from_table,
) => {
  try {
    await throw_verify_select(request_id, from_table, null, last_from_from_table);
    return true;
  } catch (error) {
    return false;
  }
}


export const save_select_results = async (
  request_id,
  last_table,
) => {
  const executions_dir = get_select_executions_dir(
    request_id, last_table.database, last_table.name
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

  const results = [];
  let out_index = 0;
  for (const index of execution_indexes) {
    if (String(index) === "0") continue;
    const execution_path = `${executions_dir}/${index}.json`;
    const execution_data = await fs.readFile(execution_path, 'utf8');
    const execution = JSON.parse(execution_data);
    const record_ciphertext = execution.transitions[0].outputs[2].value;
    const decrypted_record = global.context.account.decryptRecord(record_ciphertext);
    const record = parse_record(decrypted_record);
    const result = {
      data: record.data,
      record: decrypted_record
    };
    if (!record.decoy) {
      results.push(record.data);
      await save_request_results(
        request_id, record.data, out_index
      );
      out_index++;
    }

  }
  return results;
}


export const throw_verify_select = async (
  request_id,
  table,
  requested_commit,
  last_table
) => {
  const nested = (last_table != null);
  const address = global.context.account.address().to_string();

  let last_executions_dir = null;
  let last_execution_indexes = null;
  const executions_dir = get_select_executions_dir(
    request_id, table.database, table.name
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
  let expected_execution_amount = 0;
  if (nested) {
    last_executions_dir = get_select_executions_dir(
      table.name,
      last_table.database,
      last_table.name
    );
    const last_executions_dir_exists = await fsExists(last_executions_dir);
    if (!last_executions_dir_exists) {
      throw new Error(
        `Request '${table.name}' has no executions.`
      );
    }
    const last_filenames = await fs.readdir(last_executions_dir);
    last_execution_indexes = last_filenames.map(
      filename => parseInt(filename.split('.')[0])
    ).sort(
      (a, b) => b - a
    );
    expected_execution_amount = last_execution_indexes.length;
    last_execution_indexes.pop();
  }
  else {
    expected_execution_amount = (
      requested_commit.index * table.settings.max_new_rows_per_push + 1
    );
  }
  if (execution_indexes.length !== expected_execution_amount) {
    throw new Error(
      `Request '${request_id}' has ${execution_indexes.length} executions,`
      + ` but ${expected_execution_amount} were expected.`
    );
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
      table.name
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


    if (nested) {
      const last_execution_index = last_execution_indexes.pop();
      const last_execution_path = `${last_executions_dir}/${last_execution_index}.json`;
      const last_execution_data = await fs.readFile(last_execution_path, 'utf8');
      const last_execution = JSON.parse(last_execution_data);
      if (
        last_execution.transitions[0].outputs[3].value
        !== execution.transitions[0].outputs[4].value
      ) {
        throw new Error(
          `Nested process chain breaks at index '${index}'.`
        );
      }
    }
  }

  if (!nested && commit !== requested_commit.id) {
    throw new Error(
      `Final commit does not match requested commit '${requested_commit.id}'.`
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

