import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import ts from 'typescript';
const root = process.cwd();
const allowed = id => /^(integrated-preview\/|src\/(domain|application)\/)/.test(id) || id === 'offline-preview/scenario.ts';
export async function inspectIntegratedSource() {
  const visited = new Set();
  async function inspect(path) {
    if (visited.has(path)) return; visited.add(path);
    const id = relative(root, path).replaceAll('\\', '/'); assert.ok(allowed(id), `SOURCE_NOT_ALLOWED:${id}`);
    const source = await readFile(path, 'utf8'); const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const imports = [];
    function walk(node) {
      if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      // No dynamic import/require/eval, networking, workers or storage in this closed preview graph.
      if (ts.isCallExpression(node)) {
        assert.ok(node.expression.kind !== ts.SyntaxKind.ImportKeyword, `DYNAMIC_IMPORT:${id}`);
        assert.ok(!/\b(fetch|axios|require|eval|Function|sendBeacon|sendText|sendTemplate|sendRichCard|setDoc|addDoc|deleteDoc)\b/.test(node.expression.getText(tree)), `IO_CALL:${id}`);
      }
      if (ts.isIdentifier(node)) assert.ok(!/^(localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|navigator|firebase|supabase)$/.test(node.text), `IO_GLOBAL:${id}`);
      if (ts.isNewExpression(node)) assert.ok(!/^(Function|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker)$/.test(node.expression.getText(tree)), `IO_CONSTRUCTOR:${id}`);
      ts.forEachChild(node, walk);
    }
    walk(tree);
    for (const spec of imports) {
      if (/^(react|react-dom\/client)$/.test(spec)) continue;
      assert.ok(spec.startsWith('.'), `RUNTIME_DEPENDENCY:${id}:${spec}`);
      if (spec.endsWith('.css')) { const css = await readFile(resolve(dirname(path), spec), 'utf8'); assert.ok(!/@import|url\(/i.test(css), 'EXTERNAL_STYLE'); continue; }
      const base = resolve(dirname(path), spec); let found;
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`]) { try { await readFile(candidate); found = candidate; break; } catch (e) { if (e.code !== 'ENOENT') throw e; } }
      assert.ok(found, `UNRESOLVED_IMPORT:${spec}`); await inspect(found);
    }
  }
  await inspect(resolve('integrated-preview/main.tsx'));
  return [...visited].map(p => relative(root, p).replaceAll('\\', '/')).sort();
}
const modules = await inspectIntegratedSource();
console.log(`Integrated source isolation: ${modules.length} allowed source files, no operational imports/network/storage/send/backend entry.`);
