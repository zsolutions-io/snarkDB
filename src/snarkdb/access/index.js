import {
  Address,
  ViewKey,
  Account
} from '@aleohq/sdk';
import { random_from_type } from 'aleo/index.js';
import fs from 'fs.promises';

import { get_public_table_dir } from "snarkdb/db/index.js";
import { save_object } from 'utils/fs.js';


export const set_access = async (tablename, access) => {
  access = (access === "public" || access === "") ?
    "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc" :
    access;
  access = access.split(",");
  const addresses = access.map(
    (address) => Address.from_string(address)
  );
  await set_access_with_addresses(tablename, addresses);
};


const set_access_with_addresses = async (tablename, addresses) => {
  const context_address = global.context.account.address();
  const table_definitions_dir = get_public_table_dir(
    context_address.to_string(), tablename
  );
  const description_path = `${table_definitions_dir}/description.json`;
  const definition = JSON.parse(await fs.readFile(description_path));

  const view_key = definition.view_key;
  const view_key_address = Address.from_scalar(view_key).to_string();

  const randomizer = random_from_type("scalar");
  const schema_nonce = Address.from_scalar(randomizer).to_group();
  const schema_ciphertext = context_address.encrypt_ciphertext(
    definition.schema,
    view_key,
  );
  const enc_definition = {
    view_key_ciphertexts: addresses.map(
      (address) => address.encrypt_ciphertext(
        view_key,
        randomizer,
      )
    ),
    view_key_address,
    schema: {
      ciphertext: schema_ciphertext,
      nonce: schema_nonce,
    }
  };

  await save_object(table_definitions_dir, "encrypted_description", enc_definition);
  await save_object(table_definitions_dir, "description", definition);
}



export const read_access = async (tablename, database) => {
  const context_view_key = global.context.account.viewKey();
  const table_definitions_dir = get_public_table_dir(
    database, tablename
  );
  const enc_description_path = `${table_definitions_dir}/encrypted_description.json`;
  const enc_description = JSON.parse(await fs.readFile(enc_description_path));
  const { view_key_ciphertexts, schema, view_key_address } = enc_description;

  let view_key_scalar = null;
  for (const view_key_ciphertext of view_key_ciphertexts) {
    try {
      const this_view_key = context_view_key.decrypt_ciphertext(
        view_key_ciphertext,
        schema.nonce,
      );
      const this_view_key_address = Address.from_scalar(this_view_key).to_string();
      if (view_key_address === this_view_key_address) {
        view_key_scalar = this_view_key;
        break;
      }
    } catch (e) { }
  }
  if (view_key_scalar === null) {
    throw new Error("You don't have access to this table.");
  }
  const view_key = ViewKey.from_scalar(view_key_scalar);
  const dec_schema = view_key.decrypt_ciphertext(
    schema.ciphertext,
    Address.from_string(database).to_group()
  );

  return dec_schema;
}