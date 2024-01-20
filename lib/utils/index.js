export * from './sets.js';
export * from './arrays.js';
export * from './strings.js';
export * from './fs.js';

const cwd = process.cwd();
export const resources_dir = `${cwd}/resources`;
export const programs_dir = `${cwd}/programs`;