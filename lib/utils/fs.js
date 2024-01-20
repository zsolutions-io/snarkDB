import fs from 'fs/promises';
import fsExists from 'fs.promises.exists'


export const save_object = async (
  dir_path,
  filename,
  obj,
) => {
  const obj_path = `${dir_path}/${filename}.json`;
  const obj_data = JSON.stringify(obj, null, 2);
  if (!await fsExists(dir_path)) {
    await fs.mkdir(dir_path, { recursive: true });
  }
  await fs.writeFile(obj_path, obj_data);
}