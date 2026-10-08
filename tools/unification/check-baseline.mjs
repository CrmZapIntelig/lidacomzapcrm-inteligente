import ts from 'typescript';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error('INVALID_TSC_CONFIG');
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
const entries = diagnostics.map(d => [d.file ? relative(process.cwd(), resolve(d.file.fileName)).replaceAll('\\', '/') : null, d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : null, d.code, ts.flattenDiagnosticMessageText(d.messageText, '\n').replaceAll('\r\n', '\n')]);
const canonical = values => values.map(v => JSON.stringify(v)).sort();
const expected = JSON.parse(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
const hash = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
console.log(`Global baseline: ${entries.length} diagnostics; SHA-256 ${hash}`);
if (entries.length !== 21 || JSON.stringify(canonical(entries)) !== JSON.stringify(canonical(expected))) {
  console.error(JSON.stringify({ actual: entries, expected }));
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  process.exitCode = 1;
}
