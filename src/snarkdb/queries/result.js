
import {
  table_insert_row,
} from 'snarkdb/db/commit.js';

import {
  get_query_from_id,
  get_query_private_result_data,
} from 'snarkdb/queries/index.js';

import { sync_queries } from 'snarkdb/db/sync.js';

import {
  get_queries_dir,
  get_database_queries_dir,
  get_queries_results_dir
} from 'snarkdb/db/index.js';

import fs from 'fs/promises';
import fsExists from 'fs.promises.exists';




export const retrieve_query_result = async (query_id) => {
  return await sync_queries();
  const view_key = global.context.account.viewKey();
  const queries_dir = get_queries_dir(true);
  const owners = await fs.readdir(queries_dir);

  const pv_queries_dir = get_queries_dir(false);
  const pv_owners = await fs.readdir(pv_queries_dir);
  let found_owner = null;
  for (const owner of pv_owners) {
    const owner_dir = get_database_queries_dir(owner, true)
    const query_ids = await fs.readdir(owner_dir);
    for (const comp_query_id of query_ids) {
      if (comp_query_id === query_id) {
        found_owner = owner;
      }
    }
  };
  if (found_owner == null) {
    throw new Error(`Query with id '${query_id}' not found.`);
  }

  const query = await get_query_from_id(view_key, found_owner, query_id);
  const results_data = await get_query_private_result_data(
    query.data.origin, query.data.hash,
  );
  if (query.status !== "processed") {
    throw new Error(`Query with id '${query_id}' not processed.`);
  }
  if (results_data == null || !results_data.checked) {
    throw new Error(`Query with id '${query_id}' not verified yet.`);
  }
  if (!results_data.valid) {
    throw new Error(`Query with id '${query_id}' proof is invalid.`);
  }

  const results_dir = get_queries_results_dir(found_owner, query.data.hash);
  const results_dir_exists = await fsExists(results_dir);
  if (!results_dir_exists) {
    throw new Error(`Query '${query_id}' has no results (yet?).`);
  }
  const filenames = await fs.readdir(results_dir);
  const results = [];
  for (const filename of filenames) {
    const result_path = `${results_dir}/${filename}`;
    const result_data = await fs.readFile(result_path, 'utf8');
    results.push(JSON.parse(result_data));
  }
  console.table(results);
};




export const retrieve_query_result_former = async (query_id) => {
  await sync_queries();

  //{col_2_1:456field,col_2_2:789field,col_2_3:false}
  /*
  await table_commit_row(
    "table2",
    "{col_2_1:1field,col_2_2:0field,col_2_3:true}",
    true,
  );
  await table_commit_decoy(
    "table2",
  );
  */

  return;
  const table2 = {
    name: "table2",
    database: "aleo1386l43hhduwmh7jdpnsfg7twwnkhzmjfp2zg89qadqq5al2d8sgsw96584",
    settings: {
      capacity: 15,
      push_period: 10 * 60 * 1000, // 10 minutes
    },
  };

  const commit = {
    id: "3243118923128639625981619331863778124203358636486043328226068833027188090217field",
    index: 1,
  };


  await table_insert_row(
    "table2",
    "{col_2_1:1field,col_2_2:0field,col_2_3:true}",
  );

  /*
  await process_select_from_commit(
    "select",
    table2,
    commit
  );
 
  const valid = await verify_select_from_commit(
    "select",
    table2,
    commit
    );
    console.log("valid", valid)
    
    const query_result = await save_select_results(
      "select",
      table2
      );
      console.log("retrieved_query_result", query_result)
      */

  const select = {
    name: "select",
    database: "aleo1l96m5aqndzqm6253xee2j887xxh4c6w6h9ksdaknst9mq3xrfv8senek7g",
  };

  /*
  await process_select_from_select(
    "nested_select",
    select,
    table2
  );
  
  const res = await verify_select_from_select(
      "nested_select",
      select,
      table2
      );
      
      console.log("valid", res)
      
      const query_result = await save_select_results(
        "nested_select",
        select
        );
        console.log("retrieved_query_result", query_result)
        */

  return;
};


