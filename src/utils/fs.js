import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'


export const save_object = async (
  dir_path,
  filename,
  obj,
) => {
  await save_file(
    dir_path,
    filename,
    "json",
    JSON.stringify(obj, null, 2),
  );
}


export const save_file = async (
  dir_path,
  filename,
  extension,
  content,
) => {
  const obj_path = `${dir_path}/${filename}.${extension}`;
  const obj_data = content;
  if (!await fsExists(dir_path)) {
    await fs.mkdir(dir_path, { recursive: true });
  }
  await fs.writeFile(obj_path, obj_data);
}

