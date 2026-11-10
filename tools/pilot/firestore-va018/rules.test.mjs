import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

const root = resolve(import.meta.dirname, '../../..');
const rules = readFileSync(resolve(root, process.env.DEDICATED_RULES === '1' ? 'firestore.dedicated.rules' : 'docs/pilot/security/firestore.va-01-8.candidate.rules'), 'utf8');
const projectId = 'va018-rules-test';
const tenantId = 'prato-mineiro';
const adminUid = 'Wdt1sjpnHYhJgH8rkB7J2zKuEYt1';
const at = '2026-10-30T12:00:00.000Z';
let env;

const adminDb = () => env.authenticatedContext(adminUid, { email_verified: true }).firestore();
const unverifiedDb = () => env.authenticatedContext(adminUid, { email_verified: false }).firestore();
const otherDb = () => env.authenticatedContext('other-user', { email_verified: true }).firestore();
const anonymousDb = () => env.unauthenticatedContext().firestore();
const cash = (extra = {}) => ({ id: 'cash-1', status: 'OPEN', openedAt: at, openingCents: 10000, expected: { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 }, operator: adminUid, ...extra });
const order = (extra = {}) => ({ tenantId, mode: 'PRODUCTION', revision: 1, payload: '{}', lastCommandId: 'command-create', updatedAt: new Date(at), ...extra });
const ledger = (extra = {}) => ({ schema: 1, id: 'b'.repeat(64), tenantId, cashSessionId: 'cash-1', orderId: 'order-1', commandId: 'command-receive', customerId: 'contact-1', customerName: 'Cliente Teste', kind: 'RECEIPT', method: 'PIX', amountCents: 5000, netAmountCents: 5000, source: { entryPoint: 'DIGITAL_MENU', channel: 'NONE', creationMode: 'CUSTOMER' }, occurredAt: at, evidenceFingerprint: 'c'.repeat(64), ...extra });
const audience = (extra = {}) => ({ schema: 1, id: 'd'.repeat(64), idempotencyKey: 'SATISFACTION:prato-mineiro:2026-10-30:contact-1', tenantId, businessDate: '2026-10-30', contactId: 'contact-1', orderIds: ['order-1'], channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', status: 'DRAFT_ONLY', canSend: false, actor: adminUid, preparedAt: serverTimestamp(), ...extra });

async function seedBase() {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'unified_orders', 'order-1'), order());
    await setDoc(doc(db, 'unified_cash', 'current'), cash());
    await setDoc(doc(db, 'unified_cash_sessions', 'cash-1'), cash());
  });
}

async function recordReceipt(db = adminDb()) {
  const ledgerId = 'b'.repeat(64), evidenceId = 'c'.repeat(64);
  return runTransaction(db, async tx => {
    const orderRef = doc(db, 'unified_orders', 'order-1');
    const cashRef = doc(db, 'unified_cash', 'current');
    const historyRef = doc(db, 'unified_cash_sessions', 'cash-1');
    await Promise.all([tx.get(orderRef), tx.get(cashRef), tx.get(historyRef)]);
    const command = { fingerprint: 'a'.repeat(64), revision: 2, actor: adminUid, createdAt: serverTimestamp() };
    const event = { id: 'command-receive', commandId: 'command-receive', actor: adminUid, orderId: 'order-1', tenantId, revision: 2, previousVersion: 1, newVersion: 2, at, operation: 'RECEIVE', result: 'APPLIED', fact: 'RECEIPT', amountCents: 5000, method: 'PIX', evidenceId: 'proof-receive', cashSessionId: 'cash-1', confirmation: 'MANUAL_OPERATOR', recordedAt: serverTimestamp() };
    const nextOrder = order({ revision: 2, lastCommandId: 'command-receive', updatedAt: serverTimestamp() });
    const nextCash = cash({ expected: { DINHEIRO: 0, PIX: 5000, DEBITO: 0, CREDITO: 0 }, lastLedgerId: ledgerId });
    tx.set(orderRef, nextOrder);
    tx.set(doc(orderRef, 'commands', 'command-receive'), command);
    tx.set(doc(orderRef, 'events', 'command-receive'), event);
    tx.set(cashRef, nextCash);
    tx.set(historyRef, nextCash);
    tx.set(doc(db, 'unified_receipt_evidence', evidenceId), { tenantId, evidenceFingerprint: evidenceId, orderId: 'order-1', commandId: 'command-receive', actor: adminUid, kind: 'RECEIVE', recordedAt: serverTimestamp() });
    tx.set(doc(db, 'unified_cash_entries', ledgerId), ledger());
  });
}

async function recordRefund(db = adminDb()) {
  const ledgerId = 'e'.repeat(64), evidenceId = 'f'.repeat(64), commandId = 'command-refund';
  return runTransaction(db, async tx => {
    const orderRef = doc(db, 'unified_orders', 'order-1');
    const cashRef = doc(db, 'unified_cash', 'current');
    const historyRef = doc(db, 'unified_cash_sessions', 'cash-1');
    await Promise.all([tx.get(orderRef), tx.get(cashRef), tx.get(historyRef)]);
    const nextCash = cash({ expected: { DINHEIRO: 0, PIX: -5000, DEBITO: 0, CREDITO: 0 }, lastLedgerId: ledgerId });
    tx.set(orderRef, order({ revision: 2, lastCommandId: commandId, updatedAt: serverTimestamp() }));
    tx.set(doc(orderRef, 'commands', commandId), { fingerprint: 'a'.repeat(64), revision: 2, actor: adminUid, createdAt: serverTimestamp() });
    tx.set(doc(orderRef, 'events', commandId), { id: commandId, commandId, actor: adminUid, orderId: 'order-1', tenantId, revision: 2, previousVersion: 1, newVersion: 2, at, operation: 'REFUND', result: 'APPLIED', fact: 'REFUND', amountCents: 5000, method: 'PIX', evidenceId: 'proof-refund', cashSessionId: 'cash-1', confirmation: 'MANUAL_OPERATOR', recordedAt: serverTimestamp() });
    tx.set(cashRef, nextCash);
    tx.set(historyRef, nextCash);
    tx.set(doc(db, 'unified_receipt_evidence', evidenceId), { tenantId, evidenceFingerprint: evidenceId, orderId: 'order-1', commandId, actor: adminUid, kind: 'REFUND', recordedAt: serverTimestamp() });
    tx.set(doc(db, 'unified_cash_entries', ledgerId), ledger({ id: ledgerId, commandId, kind: 'REFUND', netAmountCents: -5000, evidenceFingerprint: evidenceId }));
  });
}

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8180, rules } });
});
beforeEach(async () => { await env.clearFirestore(); await seedBase(); });
after(async () => { await env.cleanup(); });

test('composed legacy access cannot bypass the canonical financial rules', {skip: process.env.DEDICATED_RULES !== '1'}, async () => {
  const db=adminDb();
  await assertSucceeds(setDoc(doc(db,'clients','contact-1'),{id:'contact-1',name:'Cliente Teste',phone:'+553100000000'}));
  await assertSucceeds(getDocs(collection(db,'clients')));
  await assertSucceeds(updateDoc(doc(db,'clients','contact-1'),{name:'Cliente Atualizado'}));
  await assertFails(updateDoc(doc(db,'clients','contact-1'),{tenantId:'another-tenant'}));
  await assertFails(getDocs(collection(otherDb(),'clients')));
  await assertFails(getDocs(collection(anonymousDb(),'clients')));
  await assertFails(setDoc(doc(db,'unknown_collection','x'),{id:'x'}));
  await assertFails(setDoc(doc(db,'clients','contact-1','private','x'),{id:'x'}));
  await assertFails(setDoc(doc(db,'unified_cash_entries','a'.repeat(64)),{id:'a'.repeat(64)}));
  await assertFails(updateDoc(doc(db,'unified_cash','current'),{expected:{PIX:9000,DINHEIRO:0,DEBITO:0,CREDITO:0}}));
});

test('draft composition validates the last contact and never grants sending authority', {skip: process.env.DEDICATED_RULES !== '1'}, async () => {
  const contacts=Array.from({length:50},(_,i)=>({id:`contact-${i}`,name:'Cliente',content:'Mensagem',consent:'UNKNOWN'}));
  const draft={id:'draft-1',schema:1,kind:'ACTIVE_SALES_DRAFT',status:'DRAFT',canSend:false,tenantId:'prato-mineiro-clone',actorUid:adminUid,createdAt:at,provider:'WHATSAPP_META_OFFICIAL',storageVersion:2,contactCount:50,persistedAt:serverTimestamp(),preparationPayload:'{}',marketingCampaignId:null};
  const draftDb=adminDb();
  const store=(id,rows)=>runTransaction(draftDb,async tx=>{
    tx.set(doc(draftDb,'clone_unified_sales_drafts',id),{...draft,id});
    for(const contact of rows)tx.set(doc(draftDb,'clone_unified_sales_drafts',id,'contacts',contact.id),contact);
  });
  await assertSucceeds(store('draft-1',contacts));
  await assertFails(updateDoc(doc(adminDb(),'clone_unified_sales_drafts','draft-1'),{canSend:true}));
  await assertFails(store('draft-2',[...contacts.slice(0,49),{...contacts[49],content:22}]));
  await assertFails(setDoc(doc(adminDb(),'clone_unified_sales_drafts','draft-1','contacts','extra'),{...contacts[0],id:'extra'}));
  await assertFails(getDocs(collection(otherDb(),'clone_unified_sales_drafts','draft-1','contacts')));
});

test('verified pilot operator records one fully atomic receipt', async () => {
  await assertSucceeds(recordReceipt());
  const entry = await getDoc(doc(adminDb(), 'unified_cash_entries', 'b'.repeat(64)));
  assert.equal(entry.data().netAmountCents, 5000);
});

test('a verified atomic refund decreases only its actual payment rail', async () => {
  await assertSucceeds(recordRefund());
  const current = await getDoc(doc(adminDb(), 'unified_cash', 'current'));
  assert.equal(current.data().expected.PIX, -5000);
  assert.equal(current.data().expected.DINHEIRO, 0);
});

test('public, foreign and unverified identities cannot read or list private operations', async () => {
  await assertFails(getDocs(collection(anonymousDb(), 'unified_orders')));
  await assertFails(getDoc(doc(otherDb(), 'unified_cash', 'current')));
  await assertFails(getDocs(collection(unverifiedDb(), 'unified_cash_entries')));
});

test('a direct cash mutation without its immutable ledger is rejected', async () => {
  await assertFails(updateDoc(doc(adminDb(), 'unified_cash', 'current'), { expected: { DINHEIRO: 0, PIX: 5000, DEBITO: 0, CREDITO: 0 }, lastLedgerId: 'b'.repeat(64) }));
});

test('a standalone, cross-tenant or oversized ledger cannot bypass atomic artifacts', async () => {
  const db = adminDb();
  await assertFails(setDoc(doc(db, 'unified_cash_entries', 'b'.repeat(64)), ledger()));
  await env.withSecurityRulesDisabled(async context => {
    const raw = context.firestore();
    const nextCash = cash({ expected: { DINHEIRO: 0, PIX: 5000, DEBITO: 0, CREDITO: 0 }, lastLedgerId: 'b'.repeat(64) });
    await setDoc(doc(raw, 'unified_cash', 'current'), nextCash);
    await setDoc(doc(raw, 'unified_cash_sessions', 'cash-1'), nextCash);
    await setDoc(doc(raw, 'unified_orders', 'order-1'), order({ revision: 2, lastCommandId: 'command-receive' }));
    await setDoc(doc(raw, 'unified_orders', 'order-1', 'commands', 'command-receive'), { fingerprint: 'a'.repeat(64), revision: 2, actor: adminUid, createdAt: new Date(at) });
    await setDoc(doc(raw, 'unified_orders', 'order-1', 'events', 'command-receive'), { id: 'command-receive', commandId: 'command-receive', actor: adminUid, orderId: 'order-1', tenantId, revision: 2, previousVersion: 1, newVersion: 2, at, operation: 'RECEIVE', result: 'APPLIED', fact: 'RECEIPT', amountCents: 5000, method: 'PIX', evidenceId: 'proof-receive', cashSessionId: 'cash-1', confirmation: 'MANUAL_OPERATOR', recordedAt: new Date(at) });
    await setDoc(doc(raw, 'unified_receipt_evidence', 'c'.repeat(64)), { tenantId, evidenceFingerprint: 'c'.repeat(64), orderId: 'order-1', commandId: 'command-receive', actor: adminUid, kind: 'RECEIVE', recordedAt: new Date(at) });
  });
  await assertFails(setDoc(doc(db, 'unified_cash_entries', 'b'.repeat(64)), ledger({ tenantId: 'other-tenant' })));
  await assertFails(setDoc(doc(db, 'unified_cash_entries', 'b'.repeat(64)), ledger({ customerName: 'x'.repeat(1000) })));
});

test('ledger, command, event and evidence facts are immutable and evidence is not listable', async () => {
  await assertSucceeds(recordReceipt());
  const db = adminDb();
  await assertFails(updateDoc(doc(db, 'unified_cash_entries', 'b'.repeat(64)), { amountCents: 1 }));
  await assertFails(deleteDoc(doc(db, 'unified_cash_entries', 'b'.repeat(64))));
  await assertFails(updateDoc(doc(db, 'unified_orders', 'order-1', 'commands', 'command-receive'), { revision: 99 }));
  await assertFails(updateDoc(doc(db, 'unified_orders', 'order-1', 'events', 'command-receive'), { fact: 'STATE' }));
  await assertSucceeds(getDoc(doc(db, 'unified_receipt_evidence', 'c'.repeat(64))));
  await assertFails(getDocs(collection(db, 'unified_receipt_evidence')));
});

test('cash can close only with a matching immutable history mirror and valid difference', async () => {
  const db = adminDb();
  const closed = { ...cash(), status: 'CLOSED', closedAt: '2026-10-30T18:00:00.000Z', countedCents: 10000, differenceCents: 0 };
  await assertSucceeds(runTransaction(db, async tx => {
    const current = doc(db, 'unified_cash', 'current'), history = doc(db, 'unified_cash_sessions', 'cash-1');
    await Promise.all([tx.get(current), tx.get(history)]); tx.set(current, closed); tx.set(history, closed);
  }));
  await env.clearFirestore(); await seedBase();
  await assertFails(updateDoc(doc(db, 'unified_cash', 'current'), { status: 'CLOSED', closedAt: '2026-10-30T18:00:00.000Z', countedCents: 10000, differenceCents: 0 }));
});

test('a closed current cash can be replaced by one new mirrored open session', async () => {
  const db = adminDb();
  await env.withSecurityRulesDisabled(async context => {
    const raw = context.firestore();
    const closed = { ...cash(), status: 'CLOSED', closedAt: '2026-10-30T18:00:00.000Z', countedCents: 10000, differenceCents: 0 };
    await setDoc(doc(raw, 'unified_cash', 'current'), closed);
    await setDoc(doc(raw, 'unified_cash_sessions', 'cash-1'), closed);
  });
  const reopened = { id: 'cash-2', status: 'OPEN', openedAt: '2026-10-31T10:00:00.000Z', openingCents: 5000, expected: { DINHEIRO: 0, PIX: 0, DEBITO: 0, CREDITO: 0 }, operator: adminUid };
  await assertSucceeds(runTransaction(db, async tx => {
    const current = doc(db, 'unified_cash', 'current'), history = doc(db, 'unified_cash_sessions', 'cash-2');
    await Promise.all([tx.get(current), tx.get(history)]); tx.set(current, reopened); tx.set(history, reopened);
  }));
  await env.clearFirestore(); await seedBase();
  await assertFails(setDoc(doc(db, 'unified_cash', 'current'), reopened));
});

test('satisfaction creates draft-only audiences and rejects send authority, schema pollution and exhaustion', async () => {
  const db = adminDb(), ref = doc(db, 'unified_satisfaction_audiences', 'd'.repeat(64));
  await assertSucceeds(setDoc(ref, audience()));
  await assertFails(updateDoc(ref, { canSend: true }));
  await assertFails(deleteDoc(ref));
  await assertFails(setDoc(doc(db, 'unified_satisfaction_audiences', 'e'.repeat(64)), audience({ id: 'e'.repeat(64), canSend: true })));
  await assertFails(setDoc(doc(db, 'unified_satisfaction_audiences', 'f'.repeat(64)), audience({ id: 'f'.repeat(64), extraData: 'pollution' })));
  await assertFails(setDoc(doc(db, 'unified_satisfaction_audiences', '1'.repeat(64)), audience({ id: '1'.repeat(64), idempotencyKey: 'x'.repeat(501) })));
  await assertFails(setDoc(doc(db, 'unified_satisfaction_audiences', '2'.repeat(64)), audience({ id: '2'.repeat(64), orderIds: Array.from({ length: 101 }, (_, i) => `order-${i}`) })));
});

test('operator query works only inside the fixed pilot tenant', async () => {
  await assertSucceeds(setDoc(doc(adminDb(), 'unified_satisfaction_audiences', 'd'.repeat(64)), audience()));
  await assertSucceeds(getDocs(query(collection(adminDb(), 'unified_satisfaction_audiences'), where('tenantId', '==', tenantId), where('businessDate', '==', '2026-10-30'))));
  await assertFails(setDoc(doc(adminDb(), 'unified_satisfaction_audiences', 'e'.repeat(64)), audience({ id: 'e'.repeat(64), tenantId: 'other-tenant' })));
});
