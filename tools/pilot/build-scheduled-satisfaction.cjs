const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw Error('ABSOLUTE_OUTPUT_DIRECTORY_REQUIRED');
fs.mkdirSync(output, { recursive: true });
if (fs.readdirSync(output).length) throw Error('EMPTY_OUTPUT_DIRECTORY_REQUIRED');
require('esbuild').buildSync({
  stdin: { contents: "export { dailySatisfactionDrafts } from './staging-functions/scheduledSatisfaction';", resolveDir: root, loader: 'ts' },
  outfile: path.join(output, 'index.js'), bundle: true, platform: 'node', target: 'node22',
  format: 'cjs', external: ['firebase-functions/*', 'firebase-admin/*'],

});
require('./write-function-package.cjs')(output, 'lidacomzapcrm-satisfaction', 'index.js');
