import ts from 'typescript';
import { createHash } from 'node:crypto';
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error('INVALID_TSC_CONFIG');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
const entries = diagnostics.map(d => [d.file?.fileName.replaceAll('\\', '/'), d.start, d.code, ts.flattenDiagnosticMessageText(d.messageText, '\n')]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
const hash = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
console.log(`Global baseline: ${entries.length} diagnostics; SHA-256 ${hash}`);
if (entries.length !== 21 || hash !== '765fceec507d4dbc69d0a4da97f1660e9586a9cc20a3f76c2f9d45dd8086fecd') {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  process.exitCode = 1;
}
