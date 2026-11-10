import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCloneDraft,validateRestoredCloneDraft} from './cloneDraftPersistence';
const contacts=Array.from({length:50},(_,i)=>({id:`contact-${i}`,name:'Cliente',content:'Olá',consent:'UNKNOWN'}));
const header={id:'draft-1',schema:1,storageVersion:2,contactCount:50,status:'DRAFT',canSend:false,persistedAt:'server timestamp',kind:'ACTIVE_SALES_DRAFT',tenantId:'prato-mineiro-clone',actorUid:'operator',createdAt:'2026-10-30T00:00:00Z',provider:'RCS_GOOGLE',preparationPayload:'{}',marketingCampaignId:null};
test('restores all fifty contacts without mutating input or exposing storage metadata',()=>{
  const before=structuredClone(contacts);
  const restored=restoreCloneDraft(header,contacts);
  assert.equal(restored.contacts.length,50);
  assert.equal(restored.canSend,false);
  assert.equal('persistedAt' in restored,false);
  assert.equal('storageVersion' in restored,false);
  assert.deepEqual(contacts,before);
});
test('legacy and v2 readers reject foreign tenants, invalid providers and malformed headers',()=>{
  for(const patch of [{tenantId:'other'},{provider:'FAKE'},{createdAt:'bad-date'},{actorUid:''},{kind:'SEND'},{preparationPayload:null}]){
    assert.throws(()=>restoreCloneDraft({...header,...patch},contacts),/INVALID_DRAFT/);
    assert.throws(()=>validateRestoredCloneDraft({...header,...patch,contacts}),/INVALID_DRAFT/);
  }
  const restored=restoreCloneDraft(header,contacts);
  restored.contacts[0].content='changed';
  assert.ok(contacts.every(c=>c.content==='Olá'));
  assert.equal(validateRestoredCloneDraft({...header,contacts}).canSend,false);
});
test('partial, duplicate, malformed or send-enabled drafts are refused',()=>{
  assert.throws(()=>restoreCloneDraft(header,contacts.slice(0,49)),/INCOMPLETE/);
  assert.throws(()=>restoreCloneDraft(header,[...contacts.slice(0,49),contacts[0]]),/INCOMPLETE/);
  assert.throws(()=>restoreCloneDraft(header,[...contacts.slice(0,49),{...contacts[49],content:22}]),/INCOMPLETE/);
  assert.throws(()=>restoreCloneDraft({...header,canSend:true},contacts),/INCOMPLETE/);
});
