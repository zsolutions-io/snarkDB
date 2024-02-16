import {
  Address,
  ViewKey
} from '@aleohq/sdk';
import { random_from_type } from 'aleo/types/index.js';
import { save_object } from "utils/index.js";
import fs from 'fs/promises';

export const encrypt_for_anyof_addresses_to_file = async (
  with_address,
  content,
  destination_dir,
  destination_filename,
  for_addresses,
  view_key_scalar,
) => {
  const view_key = view_key_scalar;
  const view_key_address = Address.from_scalar(view_key).to_string();

  const randomizer = random_from_type("scalar");
  const schema_nonce = Address.from_scalar(randomizer).to_group();
  const schema_ciphertext = with_address.encrypt_ciphertext(
    content,
    view_key,
  );
  const enc = {
    view_key_ciphertexts: for_addresses.map(
      (address) => address.encrypt_ciphertext(
        view_key,
        randomizer,
      )
    ),
    view_key_address,
    content: {
      ciphertext: schema_ciphertext,
      nonce: schema_nonce,
    }
  };
  await save_object(destination_dir, destination_filename, enc);
}


export const decrypt_file_from_anyof_address_no_public = async (
  anyof_view_key,
  filepath,
  from,
) => {
  const enc_description = JSON.parse(await fs.readFile(filepath));
  const { view_key_ciphertexts, content, view_key_address } = enc_description;
  let view_key_scalar = null;
  for (const view_key_ciphertext of view_key_ciphertexts) {
    try {
      const this_view_key = anyof_view_key.decrypt_ciphertext(
        view_key_ciphertext,
        content.nonce,
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
    content.ciphertext,
    Address.from_string(from).to_group()
  );
  return dec_schema;
}


export const decrypt_file_from_anyof_address = async (
  anyof_view_key,
  filepath,
  from,
) => {
  try {
    return await decrypt_file_from_anyof_address_no_public(
      ViewKey.from_scalar("0scalar"), filepath, from
    );
  } catch (e) {
    console.log(e);
    return await decrypt_file_from_anyof_address_no_public(
      anyof_view_key, filepath, from
    );
  }
}
