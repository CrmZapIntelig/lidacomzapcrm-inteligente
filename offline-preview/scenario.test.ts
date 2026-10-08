import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
import { scenarioContacts, startSession, prepareSession, nextDay, appendSyntheticContact } from './scenario';

test('visual scenario uses explicit synthetic audience, budget and fail-closed eligibility', () => {
  const initial = startSession(scenarioContacts().slice(0, 6).map(c => c.id), 2, 'RCS_FIRST_WITH_WHATSAPP_FALLBACK', 'Olá {{nome}}');
  const first = prepareSession(initial);
  assert.equal(first.sales.drafts.length, 2); assert.equal(first.sales.drafts[0].channel, 'RCS'); assert.equal(first.sales.drafts[1].channel, 'WHATSAPP');
  assert.equal(first.events.opportunities.length, 2); assert.ok(first.sales.drafts.every(d => d.canSend === false && d.mode === 'SIMULATION'));
  assert.deepEqual(prepareSession(first).sales, first.sales);
  assert.equal(prepareSession(nextDay(first)).sales.drafts.length, 3);
  assert.equal(initial.sales.drafts.length, 0);
});
test('new synthetic contact appends once without shifting stable positions', () => {
  const initial = startSession(['demo-contact-0'], 2, 'WHATSAPP', 'Olá {{nome}}');
  const next = appendSyntheticContact(initial);
  assert.deepEqual(next.sales.queue.entries[0], initial.sales.queue.entries[0]);
  assert.equal(next.sales.queue.entries[1].position, 2);
  assert.equal(appendSyntheticContact(next).sales.queue.entries.length, 2);
});
test('entry graph permits only React runtime and offline domain/application, with no I/O', () => {
  const seen = new Set<string>();
  function visit(path: string) {
    path = resolve(path); if (seen.has(path)) return; seen.add(path);
    const source = readFileSync(path, 'utf8');
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|setDoc|deleteDoc)\b/);
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly) continue;
      const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
      if (specifier.endsWith('.css')) continue;
      if (!specifier.startsWith('.')) { assert.ok(['react', 'react-dom/client'].includes(specifier)); continue; }
      const base = resolve(dirname(path), specifier);
      assert.match(base.replaceAll('\\', '/'), /\/(offline-preview|src\/(application|domain))\//);
      let file = base + '.ts'; try { readFileSync(file); } catch { file = base + '.tsx'; }
      visit(file);
    }
  }
  visit('offline-preview/main.tsx');
  assert.ok(seen.size >= 8);
  const html = readFileSync('offline-preview/index.html', 'utf8');
  assert.match(html, /connect-src 'none'/); assert.doesNotMatch(html, /https?:\/\//);
});
