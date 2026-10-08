import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';

test('built preview admits only the synthetic UI, offline core and React', async () => {
  const report = JSON.parse(await readFile('dist-offline/isolation-report.json', 'utf8'));
  assert.equal(report.mode, 'SIMULATION');
  assert.equal(report.backend, 'NONE');
  assert.equal(report.canSend, false);
  assert.ok(report.modules.length > 0);
  for (const name of report.modules) assert.match(name, /^(offline-preview\/|src\/(domain|application)\/|node_modules\/(react|react-dom|scheduler)\/)/);
});

test('loopback static preview refuses operational routes, writes and foreign hosts', async () => {
  const child = spawn(process.execPath, ['tools/unification/serve-offline.mjs'], { env: { ...process.env, OFFLINE_PREVIEW_PORT: '4179' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('preview exited before listening'); })]);
    const get = (path, method = 'GET', host = '127.0.0.1:4179') => new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: 4179, path, method, headers: { host } }, res => {
        let body = ''; res.setEncoding('utf8'); res.on('data', value => { body += value; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }); req.on('error', reject); req.end();
    });
    const page = await get('/');
    assert.equal(page.status, 200);
    assert.match(page.headers['content-security-policy'], /connect-src 'none'/);
    assert.match(page.body, /Venda ativa offline/);
    for (const path of ['/src/App.tsx', '/@fs/C:/Users/dfant/LidacomZapCRM/src/App.tsx', '/api', '/firebase.json', '/%2e%2e%2fpackage.json']) assert.equal((await get(path)).status, 404, path);
    assert.equal((await get('/', 'POST')).status, 405);
    assert.equal((await get('/', 'GET', 'foreign.invalid')).status, 403);
  } finally { child.kill(); await once(child, 'exit'); }
});
