const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'../..');
const output=process.argv[2];
if(!output||!path.isAbsolute(output))throw Error('ABSOLUTE_OUTPUT_DIRECTORY_REQUIRED');
fs.mkdirSync(output,{recursive:true});
require(path.join(root,'node_modules/esbuild')).buildSync({entryPoints:[path.join(root,'staging-functions/operationalDiagnostics.ts')],outfile:path.join(output,'lib/index.js'),bundle:true,platform:'node',target:'node22',format:'cjs',external:['firebase-functions/*','firebase-admin/*'],logLevel:'warning'});
require('./write-function-package.cjs')(output, 'lidacomzapcrm-operational-diagnostics', 'lib/index.js');
