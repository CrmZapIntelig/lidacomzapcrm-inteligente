// Hosting preview only. No Firebase credentials are read or printed by this module.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadStaging } from './staging-environment.mjs';

export function buildDeploymentArgs(state) {
  assert.equal(state.canDeploy, true, 'STAGING_NOT_READY');
  assert.equal(state.provisioned, true, 'STAGING_NOT_PROVISIONED');
  assert.match(state.projectId, /^lidacomzapcrm-staging(?:-[a-z0-9-]+)?$/, 'STAGING_PROJECT_REQUIRED');
  assert.equal(state.channel, 'pr-4', 'LIVE_CHANNEL_FORBIDDEN');
  return ['hosting:channel:deploy', 'pr-4', '--expires', '7d', '--project', state.projectId, '--config', 'firebase.staging.json', '--non-interactive', '--json'];
}

export async function deployStagingPreview() {
  const state = await loadStaging('deploy'); // Fail before subprocess/credential access.
  const report = JSON.parse(await readFile('dist-integrated/isolation-report.json', 'utf8'));
  assert.equal(report.backend, 'NONE', 'PREVIEW_BACKEND_FORBIDDEN');
  assert.equal(report.synthetic, true, 'SYNTHETIC_BUILD_REQUIRED');
  assert.equal(report.canSend, false, 'PREVIEW_SEND_FORBIDDEN');
  for (const id of report.modules) assert.ok(/^(integrated-preview\/|src\/(domain|application)\/|node_modules\/(react|react-dom|scheduler)\/)/.test(id) || id === 'offline-preview/scenario.ts', 'OPERATIONAL_MODULE_FORBIDDEN');
  assert.ok(process.env.FIREBASE_CLI_ROOT, 'FIREBASE_CLI_ROOT_REQUIRED');
  const cli = resolve(process.env.FIREBASE_CLI_ROOT, 'node_modules/firebase-tools/lib/bin/firebase.js');
  const child = spawn(process.execPath, [cli, ...buildDeploymentArgs(state)], { stdio: ['ignore', 'pipe', 'ignore'] });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', data => { output += data; if (output.length > 1024 * 1024) child.kill(); });
  const code = await new Promise((res, rej) => { child.once('error', () => rej(new Error('STAGING_CLI_START_FAILED'))); child.once('close', res); });
  assert.equal(code, 0, 'STAGING_DEPLOY_FAILED_REVIEW_CREDENTIALS_OR_QUOTA');
  const parsed = JSON.parse(output);
  assert.equal(parsed.status, 'success', 'STAGING_DEPLOY_NOT_CONFIRMED');
  console.log(JSON.stringify({ projectId: state.projectId, channel: state.channel, status: 'success' }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await deployStagingPreview(); }
  catch (error) { console.error(error.code === 'ERR_ASSERTION' ? error.message.split('\n')[0] : 'STAGING_PREVIEW_FAILED'); process.exitCode = 1; }
}
