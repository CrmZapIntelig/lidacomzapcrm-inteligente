import ts from 'typescript';
import { createHash } from 'node:crypto';
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error('INVALID_TSC_CONFIG');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
const entries = diagnostics.map(d => [d.file?.fileName.replaceAll('\\', '/'), d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null, d.code, ts.flattenDiagnosticMessageText(d.messageText, '\n')]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
const hash = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
console.log(`Global baseline: ${entries.length} diagnostics; SHA-256 ${hash}`);
if (entries.length !== 21 || hash !== '1d2ad0f9b2592f2d306e0377df6cb283f0273b414b3bbefc477656d70374957b') {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  process.exitCode = 1;
}
