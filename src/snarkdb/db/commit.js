import {
  execute_offline,
  verify_execution_no_cache,
  verify_execution,
  load_program_keys,
  load_cached_program_source,
} from 'aleo/proof.js';

import {
  get_table_commits_dir,
  get_table_commit_rows_dir,
  get_table_commit_dir,
  get_query_executions_dir,
  get_query_execution_dir,
} from 'snarkdb/db/index.js';

import { Table, description_struct_name } from 'snarkdb/sql/table.js';

import { proc_function_name } from 'snarkdb/queries/select.js';

import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'

import { random_from_type, null_value_from_type, parse_record } from 'aleo/types/index.js';

import { save_object } from 'utils/index.js';
import shuffle from 'crypto-shuffle';
import crypto from 'crypto';


const commit_data_filename = "data";


export const save_commit_data_from_id = async (database, table, commit_id, commit_data, pub, temp) => {
  const commit_dir = get_table_commit_dir(database, table, commit_id, pub, temp);
  await save_object(commit_dir, "data", commit_data);
}

export const get_commit_data_from_id = async (database, table, commit_id, pub, temp) => {
  const commit_dir = get_table_commit_dir(database, table, commit_id, pub, temp);
  const commit_path = `${commit_dir}/${commit_data_filename}.json`;
  const commit_data = await fs.readFile(commit_path, 'utf8');
  return {
    ...JSON.parse(commit_data),
    id: commit_id,
  };
}

export const remove_commit = async (database, table, commit_id, pub, temp) => {
  const commit_dir = get_table_commit_dir(database, table, commit_id, pub, temp);
  await fs.rm(commit_dir, { recursive: true });
}


export const save_commit_row = async (database, table, commit_id, row_id, row, pub, temp) => {
  const commit_dir = get_table_commit_rows_dir(database, table, commit_id, pub, temp);
  await save_object(commit_dir, row_id, row);
}

export const get_commit_rows = async (database, table, commit_id, pub, temp) => {
  const commit_dir = get_table_commit_rows_dir(database, table, commit_id, pub, temp);
  return (await fs.readdir(commit_dir)).map(
    row => row.split('.')[0]
  );
}

export const get_commit_row = async (database, table, commit_id, row_id, pub, temp) => {
  const commit_dir = get_table_commit_rows_dir(database, table, commit_id, pub, temp);
  const commit_path = `${commit_dir}/${row_id}.json`;
  return JSON.parse(await fs.readFile(commit_path, 'utf8'));
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
  origin, request_id, database, table_name, index, execution, execution_index
) => {
  const executions_dir = get_query_execution_dir(
    origin, request_id, execution_index, true
  );
  await save_object(
    executions_dir, index, JSON.parse(execution),
  );
}

export const process_select_from_commit = async (
  origin,
  request_id,
  table,
  req_commit,
  execution_index,
) => {
  const address = global.context.account.address().to_string();

  if (table.database !== address) {
    throw new Error(
      `Your address '${address}' is different from query database '${table.database}'.`
    );
  }
  const commit_data = await get_commit_data_from_id(
    table.database, table.name, req_commit.id,
  )
  const target_csk = commit_data.csk;
  const { state, csk, commit } = await initiate_select_on_commits(
    origin, request_id, address, table.name, execution_index
  );

  await execute_select_on_commits(
    origin, request_id, address, table.name, target_csk, state, csk, commit, req_commit.id, execution_index
  );
  await move_temp_to_permanent(origin, request_id, execution_index);
}


export const process_select_from_select = async (
  origin,
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
    origin, request_id, address, from_table.name, from_table_last_from_table, state, csk, commit
  );
}


const move_temp_to_permanent = async (origin, request_id, index) => {
  const temp_dir = get_query_execution_dir(origin, request_id, index, true);
  const dir = get_query_execution_dir(origin, request_id, index);
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(temp_dir, dir);
}


const execute_select_on_select = async (
  origin,
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

  const executions_dir = get_query_executions_dir(
    origin, from_request_id, true
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
      origin, request_id, database, from_request_id, execution_index, execution.execution
    );
    prev_state = execution.outputs[0];
    prev_csk = execution.inputs[1];
    prev_commit = execution.outputs[1];
  }
}


const initiate_select_on_commits = async (
  origin, request_id, address, table_name, execution_index
) => {
  const {
    execution, inputs, outputs
  } = await execute_initiate_select_on_commits();
  await save_execution(
    origin, request_id, address, table_name, 0, execution, execution_index
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
  origin,
  request_id,
  database,
  table,
  target_csk,
  initial_state,
  initial_csk,
  initial_commit,
  commit_id,
  execution_index,
) => {
  let prev_state = initial_state;
  let prev_csk = initial_csk;
  let prev_commit = initial_commit;

  const rows = await get_commit_rows(
    database, table, commit_id,
  );

  for (const [index, row_id] of rows.entries()) {
    const last_execution = (index === rows.length - 1);
    const csk = last_execution ? target_csk : random_from_type("scalar");
    const row = await get_commit_row(database, table, commit_id, row_id,);
    const nonce = await random_nonce();
    // const psk = await random_from_type("scalar");
    const row_record = (
      `{owner:${database}.private,`
      + `data:${struct_add_private_visibility(row.data)},`
      + `decoy:${row.decoy}.private,`
      //+ `psk:${psk}.private,`
      + `_nonce:${nonce}.public}`
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
      origin, request_id, database, table.name, index + 1, execution.execution, execution_index
    );
    prev_state = execution.outputs[0];
    prev_csk = execution.inputs[1];
    prev_commit = execution.outputs[1];
  }
}

const struct_add_private_visibility = (struct) => {
  return struct
    .replace(/\,\}/g, "}")
    .replace(/\}/g, ".private}")
    .replace(/\,/g, ".private,");
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

export const random_struct_data = (struct) => {
  return (
    "{"
    + struct
      .fields
      .map(
        (field) => (
          `${field.name}:${random_from_type(field.type.category === "integer" ? field.type.value : "custom")}`
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
  const function_name = proc_function_name(request_id);

  const { outputs, execution } = await execute_offline(
    request_id,
    function_name,
    inputs,
    true,
  );

  return { inputs, outputs, execution };
}




export const verify_select_from_commit = async (
  origin,
  request_id,
  from_table,
  commit_id,
) => {
  try {
    await throw_verify_select(origin, request_id, from_table, commit_id);
    return true;
  } catch (error) {
    return false;
  }
}


export const verify_select_from_select = async (
  origin,
  request_id,
  from_table,
  last_from_from_table,
) => {
  try {
    await throw_verify_select(origin, request_id, from_table, null, last_from_from_table);
    return true;
  } catch (error) {
    return false;
  }
}


export const save_select_results = async (
  request_id,
  last_table,
) => {
  const executions_dir = get_query_executions_dir(
    request_id, true
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
  origin,
  request_id,
  table,
  requested_commit,
  last_table
) => {
  console.log(table);
  return;

  const nested = (last_table != null);
  const address = global.context.account.address().to_string();

  let last_executions_dir = null;
  let last_execution_indexes = null;
  const executions_dir = get_query_executions_dir(
    origin, request_id, true
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

  console

  if (nested) {
    last_executions_dir = get_query_executions_dir(
      origin,
      table.name,
      true,
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

  let process_function_name = proc_function_name(request_id);

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

