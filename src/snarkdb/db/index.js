import { resources_dir, programs_dir } from "utils/index.js";

export const resources_programs_dir = `${resources_dir}/programs`;
export const temp_resources_dir = `${resources_dir}/temp`;
export const datasources_dir = `${resources_dir}/datasources`;
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

export const get_table_dir = (database, table_name, pub, temp) => {
  return `${get_tables_dir(pub, temp)}/${database}/${table_name}`;
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

export const get_private_query_dir = (origin, query_hash, temp) => {
  return `${get_queries_dir(false, temp)}/${origin}/${query_hash}`;
}

export const get_public_query_dir = (query_id, temp) => {
  return `${get_queries_dir(true, temp)}/${query_id}`;
}

export const get_queries_results_dir = (query_id, temp) => {
  return `${get_private_query_dir(query_id, temp)}/results`;
}

export const get_query_executions_dir = (query_id, temp) => {
  return `${get_public_query_dir(query_id, temp)}/executions`;
}

export const get_query_execution_dir = (query_id, execution_index, temp) => {
  return `${get_public_query_dir(query_id, temp)}/executions/${execution_index}`;
}

export const get_resources_program_dir_path = (program_id) => {
  return `${resources_programs_dir}/${program_id}`;
}

export const get_program_dir_path = (program_id) => {
  return `${programs_dir}/${program_id}`;
}

export * from "./commit.js";
export * from "./sync.js";
