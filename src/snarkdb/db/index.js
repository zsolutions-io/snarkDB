import { resources_dir } from "utils/index.js";


export const commits_dir = `${resources_dir}/commits`;
export const requests_dir = `${resources_dir}/requests`;
export const definitions_dir = `${resources_dir}/definitions`;
export const resources_programs_dir = `${resources_dir}/programs`;


export const get_table_definitions_dir = (database, table_name) => {
  return `${definitions_dir}/${database}/${table_name}`;
}

export const get_table_commits_dir = (database, table_name) => {
  return `${commits_dir}/${database}/${table_name}`;
}

export const get_select_request_dir = (request_id) => {
  return `${requests_dir}/${request_id}`;
}

export const get_select_preparations_dir = (request_id, database, table_name) => {
  return `${get_select_request_dir(request_id)}/preparations/${database}/${table_name}`;
}

export const get_select_results_dir = (request_id) => {
  return `${get_select_request_dir(request_id)}/results`;
}

export const get_select_executions_dir = (request_id, database, table_name) => {
  return `${get_select_request_dir(request_id)}/executions/${database}/${table_name}`;
}

export const get_program_dir_path = (program_id) => {
  return `${resources_programs_dir}/${program_id}`;
}

export * from "./commit.js";