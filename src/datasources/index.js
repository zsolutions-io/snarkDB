import { get_datasource_dir, datasources_dir } from "snarkdb/db/index.js";
import { save_object } from "utils/fs.js";
import { DataSource } from "typeorm";
import fs from "fs/promises";
import fsExists from 'fs.promises.exists'


const config_file_name = 'config';


export async function get_datasource(identifier) {
  const config = await get_datasource_config(identifier);
  const synchronize = config.synchronize != null ? config.synchronize : true;
  const datasource = new DataSource({ ...config, synchronize });
  await datasource.initialize();
  return datasource;
}


export async function get_datasource_config(identifier) {
  throw_invalid_identifier(identifier);
  const datasource_path = get_datasource_dir(identifier);
  const config_path = `${datasource_path}/${config_file_name}.json`;
  const config_content = await fs.readFile(config_path, 'utf8')
  return JSON.parse(config_content);
}


export async function list_datasources() {
  let datasources = [];
  try {
    datasources = await fs.readdir(datasources_dir);
  } catch (e) { }
  if (datasources.length === 0) {
    return console.log('No datasources found.');
  }
  console.log(`Found ${datasources.length} datasource(s):`);
  for (const identifier of datasources) {
    console.log(`\n- ${identifier}`);
    const config = await get_datasource_config(identifier);

    for (const [key, value] of Object.entries(config)) {
      const val = (key === "password") ? "***" : value;
      console.log(`  ・ ${key}: ${val}`);
    }
  }
}


export async function add_datasource(identifier, datasourceJson, overwrite) {
  throw_invalid_identifier(identifier);
  const datasource_settings = JSON.parse(datasourceJson);

  const datasource = new DataSource(datasource_settings);
  await datasource.initialize();
  const datasource_path = get_datasource_dir(identifier);
  await save_object(
    datasource_path, config_file_name, datasource_settings, !overwrite
  )
}


export async function remove_datasource(identifier) {
  throw_invalid_identifier(identifier);
  const datasource_path = get_datasource_dir(identifier);

  if (!await fsExists(datasource_path)) {
    throw new Error(`Datasource '${identifier}' does not exist.`);
  }

  await fs.rm(datasource_path, { recursive: true, force: true });
}


const throw_invalid_identifier = (identifier) => {
  const regex = /^[a-zA-Z_]+[a-zA-Z_0-9]*$/;
  if (!regex.test(identifier)) {
    throw new Error(
      'Identifier should only contain letters numbers,'
      + ' underscores and dashes.'
    );
  }
}