import { resources_dir, programs_dir } from "utils/index.js";

export const resources_programs_dir = `${resources_dir}/programs`;
export const temp_resources_dir = `${resources_dir}/temp`;
export const ipfs_storage_dir = `${resources_dir}/ipfs`;
export const datasources_dir = `${resources_dir}/datasources`;
export const peers_dir = `${resources_dir}/peers`;
export const public_resources_dir = `${resources_dir}/public`;


export const get_tables_dir = (pub, temp) => {
  const base = temp ? temp_resources_dir : resources_dir;
  const mid = pub ? "/public" : "";
  return `${base}${mid}/tables`;
}

export const get_queries_dir = (pub, temp) => {
  const base = temp ? temp_resources_dir : resources_dir;
  const mid = pub ? "/public" : "";
  return `${base}${mid}/queries`;
}

export const get_datasource_dir = (identifier) => {
  return `${datasources_dir}/${identifier}`;
}

export const get_peer_dir = (identifier) => {
  return `${peers_dir}/${identifier}`;
}

export const get_database_tables_dir = (database, pub, temp) => {
  return `${get_tables_dir(pub, temp)}/${database}`;
}

export const get_database_queries_dir = (database, pub, temp) => {
  return `${get_queries_dir(pub, temp)}/${database}`;
}

export const get_table_dir = (database, table_name, pub, temp) => {
  return `${get_database_tables_dir(database, pub, temp)}/${table_name}`;
}

export const get_ipfs_storage_path = (database) => {
  return `${ipfs_storage_dir}/${database}`;
}

export const get_table_commits_dir = (database, table_name, pub, temp) => {
  return `${get_table_dir(database, table_name, pub, temp)}/commits`;
}

export const get_table_commit_dir = (database, table_name, commit, pub, temp) => {
  return `${get_table_commits_dir(database, table_name, pub, temp)}/${commit}`;
}

export const get_table_commit_rows_dir = (database, table_name, commit, pub, temp) => {
  return `${get_table_commit_dir(database, table_name, commit, pub, temp)}/rows`;
}

export const get_query_dir = (origin, query_hash, pub, temp) => {
  return `${get_database_queries_dir(origin, pub, temp)}/${query_hash}`;
}

export const get_queries_results_dir = (origin, query_hash, temp) => {
  return `${get_query_dir(origin, query_hash, false, temp)}/results`;
}

export const get_query_executions_dir = (origin, query_hash, temp) => {
  return `${get_query_dir(origin, query_hash, true, temp)}/executions`;
}

export const get_query_execution_dir = (origin, query_hash, execution_index, temp) => {
  return `${get_query_executions_dir(origin, query_hash, temp)}/${execution_index}`;
}

export const get_resources_program_dir_path = (program_id) => {
  return `${resources_programs_dir}/${program_id}`;
}

export const get_program_dir_path = (program_id) => {
  return `${programs_dir}/${program_id}`;
}

export * from "./commit.js";
export * from "./sync.js";
