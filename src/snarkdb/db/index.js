import { resources_dir } from "utils/index.js";

export const resources_programs_dir = `${resources_dir}/programs`;
export const public_resources_dir = `${resources_dir}/public`;
export const datasources_dir = `${resources_dir}/datasources`;
export const tables_dir = `${resources_dir}/tables`;


export const get_datasource_dir = (identifier) => {
  return `${datasources_dir}/${identifier}`;
}

export const get_table_dir = (database, table_name) => {
  return `${tables_dir}/${database}/${table_name}`;
}

export const get_public_table_dir = (database, table_name) => {
  return `${public_resources_dir}/tables/${database}/${table_name}`;
}

export const get_table_commits_dir = (database, table_name) => {
  return `${get_table_dir(database, table_name)}/commits`;
}

export const get_table_commit_dir = (database, table_name, commit) => {
  return `${get_table_commits_dir(database, table_name)}/${commit}`;
}

export const get_table_commit_rows_dir = (database, table_name, commit) => {
  return `${get_table_commit_dir(database, table_name, commit)}/rows`;
}

export const get_table_commit_row_dir = (database, table_name, commit, row) => {
  return `${get_table_commit_rows_dir(database, table_name, commit)}/${row}`;
}

export const get_table_public_commits_dir = (database, table_name, commit) => {
  return `${get_public_table_dir(database, table_name)}/commits/${commit}`;
}

export const get_private_selects_dir = (request_id) => {
  return `${private_resources_dir}/selects/${request_id}`;
}

export const get_public_selects_dir = (request_id) => {
  return `${public_resources_dir}/selects/${request_id}`;
}

export const get_selects_results_dir = (request_id) => {
  return `${get_private_selects_dir(request_id)}/results`;
}

export const get_selects_executions_dir = (request_id) => {
  return `${get_public_selects_dir(request_id)}/executions`;
}

export const get_select_executions_dir = (request_id, database, table_name) => {
  return `${get_selects_executions_dir(request_id)}/${database}/${table_name}`;
}

export const get_program_dir_path = (program_id) => {
  return `${resources_programs_dir}/${program_id}`;
}

export * from "./commit.js";
export * from "./sync.js";
