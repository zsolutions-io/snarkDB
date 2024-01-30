import {
  update_access,
} from "snarkdb/access/index.js";


const name = "update_access";
const description = "Update access policy to a table scheme, name and settings. accessPolicy is 'public' or a list of comma separated addresses as 'aleo1l...hk,aleo1p...dd'.";
const arg1_name = "tableName";
const arg2_name = "accessPolicy";
const pattern = `${name} <${arg1_name}> <${arg2_name}> [OPTIONS]`;


const entrypoint = async ({ tableName, accessPolicy }) => {
  await update_access(tableName, accessPolicy);
};


export default {
  name,
  description,
  pattern,
  entrypoint
}


