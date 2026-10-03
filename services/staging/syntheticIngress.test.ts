import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createSyntheticStagingIngress } from './syntheticIngress';
import { MetaWhatsAppCloudProvider } from '../messaging/metaWhatsAppCloudProvider';
import { StagingDurableInboundJournal } from './durableInboundJournal';
import type { AtomicJsonPort } from './durableInboundJournal';
const tenantId='demo-TEST-ingress', at='2026-10-02T12:00:00.000Z';
const secret='TEST-fixture-signature';
function setup() {
  let value: string | undefined;
  const port: AtomicJsonPort={async transaction(update) {const next=update(value); value=next.value; return next.result;}};
  const journal=new StagingDurableInboundJournal(port,tenantId,'100');
  const provider=new MetaWhatsAppCloudProvider({mode:'MOCK',tenantId,wabaId:'100',phoneNumberId:'200',appSecretRef:'TEST',verifyTokenRef:'TEST'}, {async resolve(){return secret;}});
  return {journal,handle:createSyntheticStagingIngress(provider,journal,()=>at),port};
}
function request(body: unknown,path='/webhooks/meta') {
  const raw=Buffer.from(typeof body==='string'?body:JSON.stringify(body));
  return {method:'POST',path,contentType:'application/json',raw,signature:'sha256='+createHmac('sha256',secret).update(raw).digest('hex')};
}
const body={object:'whatsapp_business_account',entry:[{id:'100',changes:[{field:'messages',value:{messaging_product:'whatsapp',metadata:{phone_number_id:'200'},messages:[{id:'synthetic-TEST-ingress',from:'12025550100',timestamp:'1790942400',type:'text',text:{body:'TEST fixture only'}}]}}]}]};
test('managed synthetic challenge and raw signature boundary reject malformed requests',async()=>{
  const {handle}=setup();
  assert.equal((await handle({method:'GET',path:'/webhooks/meta',raw:Buffer.alloc(0),query:{'hub.mode':'subscribe','hub.verify_token':secret,'hub.challenge':'123'}})).body,'123');
  assert.equal((await handle({...request(body),signature:'sha256='+'0'.repeat(64)})).status,403);
  assert.equal((await handle(request('{'))).status,400);
  assert.equal((await handle({...request(body),contentType:'text/plain'})).status,415);
  assert.equal((await handle({...request(body),raw:Buffer.alloc(65537)})).status,413);
});
test('durable ACK dedupes replay; separate worker creates only a non-sending draft',async()=>{
  const {handle,journal,port}=setup();
  assert.equal((await handle(request(body))).status,200);
  assert.equal((await handle(request(body))).status,200);
  assert.equal((await journal.snapshot()).work.length,1);
  assert.equal((await handle(request({action:'TEST_PROCESS'},'/worker'))).body,'TEST_PROJECTION_COMPLETE_NO_SEND');
  const restarted=new StagingDurableInboundJournal(port,tenantId,'100');
  const snapshot=await restarted.snapshot(); assert.equal(snapshot.drafts.length,1); assert.equal(snapshot.drafts[0].canSend,false);
  assert.equal((await handle(request({action:'TEST_PROCESS'},'/worker'))).body,'TEST_NO_WORK');
});
test('failed persistence never ACKs or exposes error material',async()=>{
  const {journal}=setup(); journal.admitBatch=async()=>{throw Error('SECRET_RAW_BODY');};
  const provider=new MetaWhatsAppCloudProvider({mode:'MOCK',tenantId,wabaId:'100',phoneNumberId:'200',appSecretRef:'TEST'}, {async resolve(){return secret;}});
  const result=await createSyntheticStagingIngress(provider,journal)(request(body)); assert.deepEqual(result,{status:503,body:''});
});
test('fixture signature does not admit real text, identity or live worker commands',async()=>{
  const {handle,journal}=setup();
  assert.equal((await handle(request(JSON.stringify(body).replace('TEST fixture only','real content')))).status,400);
  assert.equal((await handle(request(JSON.stringify(body).replace('12025550100','5511999999999')))).status,400);
  const reply=structuredClone(body); Object.assign(reply.entry[0].changes[0].value.messages[0],{context:{id:'wamid.real'}});
  assert.equal((await handle(request(reply))).status,400);
  assert.equal((await handle(request(JSON.stringify(body).replace('TEST fixture only','TEST Cliente Real')))).status,400);
  const profile=structuredClone(body); Object.assign(profile.entry[0].changes[0].value,{contacts:[{profile:{name:'Cliente Real'}}]});
  assert.equal((await handle(request(profile))).status,400);
  assert.equal((await handle(request({action:'LIVE'},'/worker'))).status,400);
  assert.equal((await journal.snapshot()).work.length,0);
});
test('worker retry backoff, final failure and crash lease use the existing journal',async()=>{
  const {handle,journal}=setup(); await handle(request(body));
  assert.equal((await handle(request({action:'TEST_CLAIM_ONLY'},'/worker'))).body,'TEST_LEASE_RESERVED');
  assert.equal((await handle(request({action:'TEST_PROCESS'},'/worker'))).body,'TEST_NO_WORK');
  const later=createSyntheticStagingIngress(new MetaWhatsAppCloudProvider({mode:'MOCK',tenantId,wabaId:'100',phoneNumberId:'200',appSecretRef:'TEST'},{async resolve(){return secret;}}),journal,()=> '2026-10-02T12:00:31.000Z');
  assert.equal((await later(request({action:'TEST_RETRYABLE_FAILURE'},'/worker'))).status,200);
  assert.equal((await later(request({action:'TEST_PROCESS'},'/worker'))).body,'TEST_NO_WORK');
  const work=await journal.reserve('TEST-final','2026-10-02T12:00:35.000Z'); assert.ok(work);
  await journal.fail(work.token,'2026-10-02T12:00:35.000Z',false);
  assert.equal((await journal.snapshot()).work[0].state,'FAILED_FINAL');
});
