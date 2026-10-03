import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { inspectIntegratedSource } from './check-integrated-isolation.mjs';
test('integrated transitive source graph rejects operational/cloud/storage/send entry points', async () => {
  const modules = await inspectIntegratedSource(); assert.ok(modules.length > 4);
  assert.ok(!modules.some(p => /App\.tsx|services\/|src\/lib\/|src\/components\//.test(p)));
});
test('built integrated bundle permits only pure modules, shared fixture and React; no operational assets', async () => {
  const report = JSON.parse(await readFile('dist-integrated/isolation-report.json', 'utf8'));
  assert.equal(report.mode, 'OFFLINE PREVIEW'); assert.equal(report.backend, 'NONE'); assert.equal(report.canSend, false); assert.equal(report.synthetic, true);
  for (const id of report.modules) assert.ok(/^(integrated-preview\/|src\/(domain|application)\/|node_modules\/(react|react-dom|scheduler)\/)/.test(id) || id === 'offline-preview/scenario.ts', id);
});
test('integrated static loopback server blocks backend routes, writes, traversal, foreign host and remote connections', async () => {
  const child = spawn(process.execPath, ['tools/unification/serve-integrated.mjs'], { env: { ...process.env, INTEGRATED_PREVIEW_PORT: '4181' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('PREVIEW_START_FAILED'); })]);
    const get = (path, method = 'GET', host = '127.0.0.1:4181') => new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: 4181, path, method, headers: { host } }, res => { let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body })); }); req.on('error', reject); req.end();
    });
    const page = await get('/'); assert.equal(page.status, 200); assert.match(page.body, /LidacomZapCRM · Preview integrado/); assert.match(page.headers['content-security-policy'], /connect-src 'none'/);
    for (const path of ['/api', '/webhooks/meta', '/src/App.tsx', '/src/lib/firebase.ts', '/firebase.json', '/@fs/C:/Users/dfant/LidacomZapCRM/src/App.tsx', '/%2e%2e%2fpackage.json']) assert.equal((await get(path)).status, 404, path);
    assert.equal((await get('/', 'POST')).status, 405); assert.equal((await get('/', 'GET', 'foreign.invalid')).status, 403);
  } finally { child.kill(); await once(child, 'exit'); }
});
