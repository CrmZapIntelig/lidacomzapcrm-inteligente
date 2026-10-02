import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import ts from 'typescript';

const root = process.cwd(), visited = new Set();
async function resolveImport(path, specifier) {
  const base = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(path), specifier) : undefined;
  if (!base) return undefined;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    try { await readFile(candidate); return candidate; } catch (e) { if (!['ENOENT', 'EISDIR'].includes(e.code)) throw e; }
  }
}
async function inspectFrontend(path) {
  if (visited.has(path)) return; visited.add(path);
  const source = await readFile(path, 'utf8');
  assert.ok(!/^services\/(messaging|staging)\//.test(relative(root, path).replaceAll('\\', '/')), 'SERVER_PROVIDER_IN_FRONTEND');
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const imports = [];
  function walk(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    ts.forEachChild(node, walk);
  }
  walk(tree);
  for (const specifier of imports) { const imported = await resolveImport(path, specifier); if (imported) await inspectFrontend(imported); }
}
await inspectFrontend(resolve('src/App.tsx'));
await inspectFrontend(resolve('offline-preview/main.tsx'));
for (const directory of ['services/messaging', 'services/staging']) {
for (const file of await readdir(directory)) {
  if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
  const source = await readFile(`${directory}/${file}`, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function check(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) assert.ok(!/firebase|google-cloud|dotenv|axios|undici|node:https|node:net/.test(node.moduleSpecifier.text), `UNAUTHORIZED_NETWORK_OR_CLOUD_DEPENDENCY:${file}`);
    if (ts.isCallExpression(node)) {
      assert.ok(node.expression.getText(tree) !== 'fetch' || (directory === 'services/staging' && file === 'firestoreHttp.ts'), `TRANSPORT_NOT_ALLOWED:${file}`);
      assert.ok(!/^console\./.test(node.expression.getText(tree)), `UNREVIEWED_LOG:${file}`);
      if (file === 'localWebhookRuntime.ts' || directory === 'services/staging') assert.ok(!/\.(sendText|sendTemplate|sendRichCard)$/.test(node.expression.getText(tree)), 'AUTO_SEND_NOT_ALLOWED');
    }
    ts.forEachChild(node, check);
  }
  check(tree);
}
}
console.log(`Messaging safety: frontend/server separated (${visited.size} source files); only explicit staging Firestore HTTP boundary; providers have no transport/auto-send binding.`);
