
import {
  table_commit_row, process_select_from_commit, verify_select_from_commit
} from '../dbsync/commit.js';


export const retrieve_query_result = async (query_id) => {

  /*
  await table_commit_row(
      "table2",
      "{col_2_1:12field,col_2_2:10field,col_2_3:false}",
      true,
  )*/

  /*
  await process_select_from_commit(
    "select",
    "table2",
    "2018196390343346534418183814147800459533060853564783886707839110607682743745field"
  );
  */

  await verify_select_from_commit(
    "select",
    "table2",
    "2018196390343346534418183814147800459533060853564783886707839110607682743745field"
  );

  return;
};