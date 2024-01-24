
import {
  table_commit_row,
  process_select_from_commit,
  verify_select_from_commit,
  table_commit_decoy,
  save_select_results,
  process_select_from_select,
  verify_select_from_select
} from 'snarkdb/db/commit.js';

import {
  Address
} from '@aleohq/wasm';

export const retrieve_query_result = async (query_id) => {

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
  console.log(Address.from_scalar("0scalar").to_string());

  const table2 = {
    name: "table2",
    database: "aleo1386l43hhduwmh7jdpnsfg7twwnkhzmjfp2zg89qadqq5al2d8sgsw96584",
    settings: {
      max_new_rows_per_push: 15,
      push_period: 10 * 60 * 1000, // 10 minutes
    },
  };

  const commit = {
    id: "3243118923128639625981619331863778124203358636486043328226068833027188090217field",
    index: 1,
  };

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
      */

  const query_result = await save_select_results(
    "nested_select",
    select
  );
  console.log("retrieved_query_result", query_result)

  return;
};


