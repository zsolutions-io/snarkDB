
import {
  table_commit_row, process_select_from_commit, verify_select_from_commit, throw_verify_select_from_commit
} from '../dbsync/commit.js';


export const retrieve_query_result = async (query_id) => {

  //{col_2_1:456field,col_2_2:789field,col_2_3:false}
  /*
  await table_commit_row(
    "table2",
    "{col_2_1:920field,col_2_2:20222field,col_2_3:false}",
    true,
  );
  */

  /*
await process_select_from_commit(
  "select",
  "table2",
  "3096164934608151419096237308609092400291480759039448844121954865540510981108field"
);
*/

  const valid = await throw_verify_select_from_commit(
    "select",
    "table2",
    "3096164934608151419096237308609092400291480759039448844121954865540510981108field"
  );
  console.log(valid);


  return;
};


