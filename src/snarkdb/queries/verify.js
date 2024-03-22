import {
  get_query_execution_dir,
  get_queries_results_dir,
} from 'snarkdb/db/index.js';
import fs from 'fs/promises';
import fsExists from 'fs.promises.exists';
import { save_object } from 'utils/index.js';

import { parse_record } from 'aleo/types/index.js';

import { verify_select_from_commit } from 'snarkdb/db/commit.js';
import { decode_base58_to_commit_ids } from 'snarkdb/sql/table.js';


export const verify_query_results = async (owner, query_id, query) => {
  const encoded_commit_ids = query.ast.from.map(table => table.table.split('_').at(-1)).at(-1);
  const commit_ids = decode_base58_to_commit_ids(encoded_commit_ids);
  return await verify_select_from_commit(
    owner,
    query_id,
    query.table,
    commit_ids.data_commit_id,
  );
}

export const get_query_results = async (owner, query_id, query) => {
  try {
    const execution_index = query
      .table
      .executions
      .sort((a, b) => a.index - b.index)
      .at(-1)
      .index;
    const executions_dir = get_query_execution_dir(
      owner, query_id, execution_index
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
      if (!record.decoy) {
        results.push(record.data);
        await save_request_results(
          owner, query.data.hash, record.data, out_index
        );
        out_index++;
      }
    }
    return results;
  } catch (e) {
    console.log(e);
  }
}


export const save_request_results = async (
  origin, request_id, result, index
) => {
  const results_dir = get_queries_results_dir(
    origin,
    request_id,
  );
  await save_object(
    results_dir, index, result,
  );
}

