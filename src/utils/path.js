import path from 'path';
import { fileURLToPath, } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const root_path = path.resolve(__dirname, '../..');


export const resources_dir = `${root_path}/resources`;
export const programs_dir = `${root_path}/programs`;
export const programs_to_copy = ["utils", "table2", "select", "nested_select"];

