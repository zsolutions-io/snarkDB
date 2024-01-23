import path from 'path';
import url from 'url';
import { readFile } from 'fs/promises';
const jsConfig = JSON.parse(await readFile(new URL('jsconfig.json', import.meta.url)));

export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'  // or specific version e.g., "14"
      },
      modules: false  // This preserves ES modules
    }]
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: [path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), jsConfig.compilerOptions.baseUrl)],
      },
    ],
  ],
};