import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { assertEnvironment, operationalProject, validateStaging } from './staging-environment.mjs';
import { buildDeploymentArgs } from './deploy-staging-preview.mjs';
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const fixture = async () => ({ manifest: await read('config/staging-environment.json'), aliases: await read('.firebaserc'), hosting: await read('firebase.staging.json') });
test('unprovisioned staging preparation preserves default and cannot claim cloud deployment', async () => {
  const input = await fixture(); input.manifest.provisioned = false;
  assert.equal(validateStaging(input).canDeploy, false);
  assert.throws(() => validateStaging({ ...input, purpose: 'deploy' }), /UNPROVISIONED/);
});
test('APP_ENV staging rejects operational project across all project environment variables', async () => {
  for (const variable of ['FIREBASE_PROJECT_ID', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
    const input = await fixture();
    assert.throws(() => validateStaging({ ...input, environment: { APP_ENV: 'staging', [variable]: operationalProject } }), /PRODUCTION_PROJECT_FORBIDDEN/);
  }
});
test('missing/unknown environment never falls back to production; development requires demo', () => {
  assert.throws(() => assertEnvironment({ projectId: operationalProject }, 'lidacomzapcrm-staging'), /APP_ENV_REQUIRED/);
  assert.throws(() => assertEnvironment({ appEnv: 'development', projectId: operationalProject }), /DEVELOPMENT_REQUIRES_DEMO/);
  assert.doesNotThrow(() => assertEnvironment({ appEnv: 'development', projectId: 'demo-lidacomzapcrm' }));
  assert.doesNotThrow(() => assertEnvironment({ appEnv: 'production', projectId: operationalProject }));
});
test('wrong alias/site/build, live channel and backend rewrite cannot deploy', async () => {
  for (const mutate of [x => x.aliases.projects.default = x.manifest.projectId, x => x.aliases.projects.staging = operationalProject, x => x.hosting.hosting.site = operationalProject, x => x.hosting.hosting.public = 'dist', x => x.manifest.hostingChannel = 'live', x => x.hosting.hosting.rewrites = [{ source: '**', function: 'worker' }]]) {
    const input = await fixture(); mutate(input); assert.throws(() => validateStaging(input));
  }
});
test('only matching provisioned project/alias permits preview deployment validation', async () => {
  const input = await fixture(); input.manifest.provisioned = true; input.aliases.projects.staging = input.manifest.projectId;
  const result = validateStaging({ ...input, purpose: 'deploy' });
  assert.equal(result.canDeploy, true); assert.equal(result.canSend, false); assert.equal(result.channel, 'pr-4');
  delete input.aliases.projects.staging; assert.throws(() => validateStaging({ ...input, purpose: 'deploy' }), /ALIAS_REQUIRED/);
});
test('billing/provider/send/persistence activation requires a later explicit phase', async () => {
  for (const [field, value] of [['billingEnabled', true], ['fixturesOnly', false], ['backend', 'FIRESTORE'], ['canSend', true], ['metaProvider', 'LIVE'], ['rcsProvider', 'LIVE'], ['firestoreProvisioned', true], ['webhookProvisioned', true]]) {
    const input = await fixture(); input.manifest[field] = value; assert.throws(() => validateStaging(input));
  }
});
test('hosting denies remote connections and cannot route to operational APIs', async () => {
  const input = await fixture(); input.hosting.hosting.headers[0].headers = [];
  assert.throws(() => validateStaging(input), /NO_NETWORK_CSP/);
  input.hosting = await read('firebase.staging.json'); input.hosting.functions = { source: 'services' };
  assert.throws(() => validateStaging(input), /HOSTING_ONLY/);
});
test('deployment invocation binds explicit project/config and non-live channel; cannot use default', () => {
  const state = { canDeploy: true, provisioned: true, projectId: 'lidacomzapcrm-staging', channel: 'pr-4' };
  assert.deepEqual(buildDeploymentArgs(state), ['hosting:channel:deploy', 'pr-4', '--expires', '7d', '--project', 'lidacomzapcrm-staging', '--config', 'firebase.staging.json', '--non-interactive', '--json']);
  assert.throws(() => buildDeploymentArgs({ ...state, projectId: operationalProject }));
  assert.throws(() => buildDeploymentArgs({ ...state, channel: 'live' }));
  assert.throws(() => buildDeploymentArgs({ ...state, provisioned: false }));
});
test('unprovisioned deploy command stops before invoking Firebase or consulting credentials', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'crm-staging-guard-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = await fixture(); input.manifest.provisioned = false;
  await mkdir(join(directory, 'config'));
  await writeFile(join(directory, 'config/staging-environment.json'), JSON.stringify(input.manifest));
  await writeFile(join(directory, '.firebaserc'), JSON.stringify(input.aliases));
  await writeFile(join(directory, 'firebase.staging.json'), JSON.stringify(input.hosting));
  const child = spawn(process.execPath, [resolve('tools/unification/deploy-staging-preview.mjs')], { cwd: directory, env: { ...process.env, APP_ENV: 'staging', FIREBASE_CLI_ROOT: '/nonexistent-staging-cli' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
  const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  assert.equal(exit, 1); assert.equal(stdout, ''); assert.match(stderr, /STAGING_UNPROVISIONED/);
  assert.doesNotMatch(stderr, /STAGING_CLI_START_FAILED/);
});
test('operational Vite entry refuses APP_ENV staging before bundling the CRM', async () => {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { env: { ...process.env, APP_ENV: 'staging' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
  const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  assert.notEqual(exit, 0); assert.match(stderr, /STAGING_OPERATIONAL_ENTRY_FORBIDDEN/);
  assert.doesNotMatch(stdout, /modules transformed/);
});
