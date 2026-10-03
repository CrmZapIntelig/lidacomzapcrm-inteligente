import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('managed runtime stays private, bounded, synthetic and separate from Hosting',()=>{
  const config=JSON.parse(read('config/staging-runtime.json'));
  assert.equal(config.projectId,'lidacomzapcrm-staging'); assert.equal(config.invoker,'PRIVATE_IAM');
  assert.equal(config.runtimeServiceAccount,'crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com');
  assert.equal(config.minInstances,0); assert.equal(config.maxInstances,1); assert.equal(config.concurrency,1);
  assert.equal(config.timeoutSeconds,60); assert.equal(config.maxBodyBytes,65536); assert.equal(config.canSend,false);
  assert.equal(config.metaProvider,'DISABLED'); assert.equal(config.rcsProvider,'DISABLED'); assert.equal(config.budgetIsHardCap,false);
  const entry=read('staging-functions/index.ts');
  assert.match(entry,/invoker:\['crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com'\]/); assert.match(entry,/process.env.GCLOUD_PROJECT !== projectId/);
  assert.ok(!/console\.|\.sendText\(|\.sendTemplate\(|\.sendRichCard\(|fetch\(|axios|src\/App|src\/lib\/firebase/.test(entry));
  assert.deepEqual(Object.keys(JSON.parse(read('firebase.functions.staging.json'))),['functions']);
  const hosting=JSON.parse(read('firebase.staging.json')); assert.ok(!hosting.hosting.rewrites);
});
