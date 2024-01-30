import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'


export const save_object = async (
  dir_path,
  filename,
  obj,
  throw_if_exists,
) => {
  if (throw_if_exists == null) throw_if_exists = false;
  await save_file(
    dir_path,
    filename,
    "json",
    JSON.stringify(obj, null, 2),
    throw_if_exists,
  );
}


export const save_file = async (
  dir_path,
  filename,
  extension,
  content,
  throw_if_exists,
) => {
  if (throw_if_exists == null) throw_if_exists = false;
  const obj_path = `${dir_path}/${filename}.${extension}`;
  const obj_data = content;
  const exists = await fsExists(obj_path);
  if (throw_if_exists && exists) {
    throw new Error(`Error: file ${obj_path} already exists.`);
  }
  if (!exists) {
    await fs.mkdir(dir_path, { recursive: true });
  }
  await fs.writeFile(obj_path, obj_data);
}

