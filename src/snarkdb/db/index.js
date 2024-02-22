import { resources_dir, programs_dir } from "utils/index.js";

export const resources_programs_dir = `${resources_dir}/programs`;
export const public_resources_dir = `${resources_dir}/public`;

export const datasources_dir = `${resources_dir}/datasources`;
export const tables_dir = `${resources_dir}/tables`;
export const queries_dir = `${resources_dir}/queries`;

export const public_tables_dir = `${public_resources_dir}/tables`;
export const public_queries_dir = `${public_resources_dir}/queries`;

export const get_datasource_dir = (identifier) => {
  return `${datasources_dir}/${identifier}`;
}

export const get_table_dir = (database, table_name) => {
  return `${tables_dir}/${database}/${table_name}`;
}

export const get_public_table_dir = (database, table_name) => {
  return `${public_tables_dir}/${database}/${table_name}`;
}

export const get_table_commits_dir = (database, table_name) => {
  return `${get_table_dir(database, table_name)}/commits`;
}

export const get_public_table_commits_dir = (database, table_name) => {
  return `${get_public_table_dir(database, table_name)}/commits`;
}

export const get_table_commit_dir = (database, table_name, commit) => {
  return `${get_table_commits_dir(database, table_name)}/${commit}`;
}

export const get_public_table_commit_dir = (database, table_name, commit) => {
  return `${get_public_table_commits_dir(database, table_name)}/${commit}`;
}

export const get_table_commit_rows_dir = (database, table_name, commit) => {
  return `${get_table_commit_dir(database, table_name, commit)}/rows`;
}

export const get_public_table_commit_rows_dir = (database, table_name, commit) => {
  return `${get_public_table_commit_dir(database, table_name, commit)}/rows`;
}

export const get_private_query_dir = (origin, query_hash) => {
  return `${queries_dir}/${origin}/${query_hash}`;
}

export const get_public_query_dir = (query_id) => {
  return `${public_queries_dir}/${query_id}`;
}

export const get_queries_results_dir = (query_id) => {
  return `${get_private_query_dir(query_id)}/results`;
}

export const get_query_executions_base_dir = (query_id) => {
  return `${get_public_query_dir(query_id)}/executions`;
}

export const get_query_executions_dir = (query_id, database, table_name) => {
  return `${get_query_executions_base_dir(query_id)}/${database}/${table_name}`;
}

export const get_resources_program_dir_path = (program_id) => {
  return `${resources_programs_dir}/${program_id}`;
}

export const get_program_dir_path = (program_id) => {
  return `${programs_dir}/${program_id}`;
}

export * from "./commit.js";
export * from "./sync.js";
