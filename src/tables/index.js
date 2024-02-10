import { get_datasource } from "datasources/index.js";

const config_file_name = 'config';


export async function get_table(tablename) {
  const database = global.context.account.address();
  const config = await get_table_config(database, tablename);
  return config;
}



export async function list_tables() {

}


export async function expose_table(datasource_id, source_table, destination_table, visiblity) {
  const datasource = await get_datasource(datasource_id);


}



const throw_invalid_tablename = (identifier) => {
  const regex = /^[a-zA-Z_]{1}[a-zA-Z_0-9\-]*$/;
  if (!regex.test(identifier)) {
    throw new Error(
      'Identifier should only contain letters numbers,'
      + ' underscores and dashes.'
    );
  }
}