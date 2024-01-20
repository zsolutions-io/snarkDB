
import {
  table_commit_row,
  process_select_from_commit,
  verify_select_from_commit,
  throw_verify_select_from_commit,
  table_commit_decoy,
  parse_results_select_from_commit,
} from '../dbsync/commit.js';


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

  const table = {
    name: "table2",
    settings: {
      max_new_rows_per_push: 15,
      push_period: 10 * 60 * 1000, // 10 minutes
    }
  };

  const commit = {
    id: "3243118923128639625981619331863778124203358636486043328226068833027188090217field",
    index: 1,
  };


  await process_select_from_commit(
    "select",
    table,
    commit
  );
  /*

const valid = await verify_select_from_commit(
  "select",
  table,
  commit
  );
  console.log("valid", valid)
  
  const query_result = await parse_results_select_from_commit(
    "select",
    table,
    commit
    );
    console.log("retrieved_query_result", query_result)
    */

  return;
};


