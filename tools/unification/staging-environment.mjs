import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const operationalProject = 'project-1300957a-ea82-4645-845';
export const stagingCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; media-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export function assertEnvironment({ appEnv, projectId }, stagingProject) {
  assert.ok(['development', 'staging', 'production'].includes(appEnv), 'APP_ENV_REQUIRED');
  assert.ok(typeof projectId === 'string' && projectId.length > 0, 'PROJECT_ID_REQUIRED');
  if (appEnv === 'staging') {
    assert.notEqual(projectId, operationalProject, 'STAGING_PRODUCTION_PROJECT_FORBIDDEN');
    assert.equal(projectId, stagingProject, 'STAGING_PROJECT_MISMATCH');
  } else if (appEnv === 'production') {
    assert.equal(projectId, operationalProject, 'PRODUCTION_PROJECT_MISMATCH');
  } else {
    assert.match(projectId, /^demo-lidacomzapcrm(?:-[a-z0-9-]+)?$/, 'DEVELOPMENT_REQUIRES_DEMO_PROJECT');
  }
}

export function validateStaging({ manifest, aliases, hosting, environment = {}, purpose = 'prepare' }) {
  assert.ok(['prepare', 'deploy'].includes(purpose), 'INVALID_STAGING_PURPOSE');
  assert.equal(manifest.schemaVersion, 1, 'INVALID_STAGING_SCHEMA');
  assert.equal(manifest.appEnv, 'staging', 'STAGING_ENV_REQUIRED');
  assert.match(manifest.projectId, /^lidacomzapcrm-staging(?:-[a-z0-9-]+)?$/, 'EXPLICIT_STAGING_PROJECT_REQUIRED');
  assert.notEqual(manifest.projectId, operationalProject, 'STAGING_PRODUCTION_PROJECT_FORBIDDEN');
  assert.equal(aliases.projects.default, operationalProject, 'DEFAULT_ALIAS_MUST_BE_PRESERVED');
  if (aliases.projects.staging !== undefined) assert.equal(aliases.projects.staging, manifest.projectId, 'STAGING_ALIAS_MISMATCH');
  assert.equal(typeof manifest.provisioned, 'boolean', 'PROVISIONING_STATE_REQUIRED');
  if (manifest.provisioned) assert.equal(aliases.projects.staging, manifest.projectId, 'PROVISIONED_STAGING_ALIAS_REQUIRED');
  if (purpose === 'deploy') assert.equal(manifest.provisioned, true, 'GATE_FIREBASE_REAUTH_REQUIRED_OR_STAGING_UNPROVISIONED');
  assert.equal(manifest.billingEnabled, false, 'GATE_STAGING_BILLING_REQUIRED');
  assert.equal(manifest.fixturesOnly, true, 'STAGING_FIXTURES_ONLY');
  assert.equal(manifest.backend, 'NONE', 'STG01_BACKEND_FORBIDDEN');
  assert.equal(manifest.canSend, false, 'STAGING_SEND_FORBIDDEN');
  assert.equal(manifest.metaProvider, 'DISABLED', 'META_MUST_REMAIN_DISABLED');
  assert.equal(manifest.rcsProvider, 'DISABLED', 'RCS_MUST_REMAIN_DISABLED');
  // STG-02 server persistence can coexist with Hosting; it never enables preview backend.
  assert.equal(typeof manifest.firestoreProvisioned, 'boolean', 'FIRESTORE_PROVISIONING_STATE_REQUIRED');
  assert.equal(manifest.webhookProvisioned, false, 'STG01_WEBHOOK_NOT_PROVISIONED');
  assert.equal(manifest.hostingChannel, 'pr-4', 'NON_LIVE_CHANNEL_REQUIRED');
  assert.equal(manifest.hostingPublic, 'dist-integrated', 'ISOLATED_BUILD_REQUIRED');
  assert.deepEqual(Object.keys(hosting), ['hosting'], 'STG01_HOSTING_ONLY');
  assert.deepEqual(Object.keys(hosting.hosting).sort(), ['headers', 'ignore', 'public', 'site'], 'STAGING_HOSTING_KEYS_REQUIRED');
  assert.equal(hosting.hosting.public, 'dist-integrated', 'OPERATIONAL_BUILD_FORBIDDEN');
  assert.equal(hosting.hosting.site, manifest.projectId, 'EXPLICIT_STAGING_SITE_REQUIRED');
  assert.ok(!hosting.hosting.rewrites && !hosting.hosting.redirects && !hosting.hosting.predeploy && !hosting.hosting.postdeploy, 'BACKEND_OR_HOOK_FORBIDDEN');
  const headers = hosting.hosting.headers;
  assert.equal(headers.length, 1, 'GLOBAL_HEADERS_REQUIRED');
  assert.equal(headers[0].source, '**', 'GLOBAL_HEADERS_REQUIRED');
  const csp = headers[0].headers.find(h => h.key === 'Content-Security-Policy')?.value;
  assert.equal(csp, stagingCsp, 'STAGING_NO_NETWORK_CSP_REQUIRED');
  assert.equal(environment.APP_ENV ?? 'staging', 'staging', 'STAGING_ENV_REQUIRED');
  for (const name of ['FIREBASE_PROJECT_ID', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
    if (environment[name] !== undefined) assertEnvironment({ appEnv: 'staging', projectId: environment[name] }, manifest.projectId);
  }
  return { appEnv: 'staging', projectId: manifest.projectId, provisioned: manifest.provisioned, channel: manifest.hostingChannel, canDeploy: purpose === 'deploy', canSend: false };
}

export async function loadStaging(purpose = 'prepare') {
  const read = async path => JSON.parse(await readFile(path, 'utf8'));
  const [manifest, aliases, hosting] = await Promise.all([read('config/staging-environment.json'), read('.firebaserc'), read('firebase.staging.json')]);
  return validateStaging({ manifest, aliases, hosting, environment: process.env, purpose });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await loadStaging(process.argv[2] ?? 'prepare'))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
