import test from 'node:test';
import assert from 'node:assert/strict';
import { createCashLedgerEntry, reconcileCashLedger } from './productionCashLedger';
import { reconstructLegacyCashEntry } from './legacyCashLedgerReconciliation';
import type { CashSession } from './productionFinance';
import type { OperationalCommand, OperationalEvent, OperationalSnapshot } from './productionOrders';

const tenantId = 'prato-mineiro';
const at = '2026-10-29T18:00:00.000Z';
const session = (): CashSession => ({ id: 'cash-1', status: 'OPEN', openedAt: at, openingCents: 10000, expected: { DINHEIRO: 0, PIX: 5000, DEBITO: 0, CREDITO: 0 }, operator: 'operator-1' });
const snapshot = (): OperationalSnapshot => ({
  schema: 1, mode: 'PRODUCTION', revision: 3,
  canonical: { id: 'order-1', tenantId, contactId: 'contact-1', entryPoint: 'DIGITAL_MENU', channel: 'NONE', creationMode: 'CUSTOMER', total: 50, status: 'PAID', paymentMethod: 'PIX', createdAt: new Date(at), updatedAt: new Date(at) },
  customer: { id: 'contact-1', name: 'Cliente Teste' }, conversation: null, modality: 'PICKUP', items: [], subtotalCents: 5000, feeCents: 0, discountCents: 0, totalCents: 5000, address: null, table: null, legacyRefs: [], method: 'PIX', orderState: 'CONFIRMED', paymentState: 'RECEIVED', receivedCents: 5000, productionState: 'WAITING', deliveryState: 'NOT_APPLICABLE', courierId: null, notaState: 'NOT_REQUESTED',
});
const command = (kind: 'RECEIVE' | 'REFUND' = 'RECEIVE'): OperationalCommand => ({ commandId: `command-${kind.toLowerCase()}`, idempotencyKey: `command-${kind.toLowerCase()}`, tenantId, orderId: 'order-1', expectedRevision: 2, actor: 'operator-1', at, operation: { kind, amountCents: 5000, method: 'PIX', evidenceId: `proof-${kind.toLowerCase()}` } });
const event = (kind: 'RECEIVE' | 'REFUND' = 'RECEIVE'): OperationalEvent => ({ id: `command-${kind.toLowerCase()}`, commandId: `command-${kind.toLowerCase()}`, actor: 'operator-1', orderId: 'order-1', tenantId, revision: 3, previousVersion: 2, newVersion: 3, at, operation: kind, result: 'APPLIED', fact: kind === 'REFUND' ? 'REFUND' : 'RECEIPT', amountCents: 5000, method: 'PIX', evidenceId: `proof-${kind.toLowerCase()}` });
const fingerprint = 'a'.repeat(64);

const legacy = () => ({ id: 'ledger-legacy', tenantId, session: session(), snapshot: snapshot(),
  event: { ...event(), cashSessionId: 'cash-1', confirmation: 'MANUAL_OPERATOR' },
  evidenceFingerprint: fingerprint, commandRecord: { revision: 3, actor: 'operator-1', fingerprint },
  evidenceRecord: { tenantId, orderId: 'order-1', commandId: 'command-receive', actor: 'operator-1', kind: 'RECEIVE' } });

test('legacy receipt reconstructs the existing fact without changing cash or payment', () => {
  const input = legacy(), before = structuredClone(input);
  const entry = reconstructLegacyCashEntry(input);
  assert.deepEqual(input, before);
  assert.equal(entry.amountCents, 5000);
  assert.equal(reconcileCashLedger(tenantId, input.session, [entry]).reconciled, true);
});

test('legacy reconstruction rejects incomplete, cross-tenant and conflicting evidence', () => {
  for (const change of [
    (x: ReturnType<typeof legacy>) => { x.event.cashSessionId = 'other'; },
    (x: ReturnType<typeof legacy>) => { x.event.confirmation = ''; },
    (x: ReturnType<typeof legacy>) => { x.evidenceRecord.tenantId = 'other'; },
    (x: ReturnType<typeof legacy>) => { x.evidenceRecord.commandId = 'other'; },
    (x: ReturnType<typeof legacy>) => { x.commandRecord.revision = 2; },
    (x: ReturnType<typeof legacy>) => { x.event.previousVersion = 1; },
    (x: ReturnType<typeof legacy>) => { x.snapshot.revision = 2; },
    (x: ReturnType<typeof legacy>) => { x.event.at = '2026-10-28T12:00:00Z'; },
  ]) { const input = legacy(); change(input); assert.throws(() => reconstructLegacyCashEntry(input), /LEGACY_CASH_EVIDENCE_MISMATCH/); }
});

test('pre-tenant evidence requires the explicit dedicated database and never accepts another tenant', () => {
  const input = legacy();
  const oldProof = { orderId: input.evidenceRecord.orderId, commandId: input.evidenceRecord.commandId, actor: input.evidenceRecord.actor, kind: input.evidenceRecord.kind };
  assert.throws(() => reconstructLegacyCashEntry({...input,evidenceRecord:oldProof}), /EVIDENCE_MISMATCH/);
  assert.equal(reconstructLegacyCashEntry({...input,evidenceRecord:oldProof,legacyDedicatedDatabase:'lidacomzapcrm-work-20261021'}).netAmountCents,5000);
  assert.throws(() => reconstructLegacyCashEntry({...input,evidenceRecord:{...oldProof,tenantId:'other'},legacyDedicatedDatabase:'lidacomzapcrm-work-20261021'}), /EVIDENCE_MISMATCH/);
});

test('confirmed receipt creates one immutable cash-ledger fact with order origin', () => {
  const entry = createCashLedgerEntry({ id: 'ledger-1', tenantId, session: session(), command: command(), snapshot: snapshot(), event: event(), evidenceFingerprint: fingerprint });
  assert.equal(entry.netAmountCents, 5000);
  assert.equal(entry.source.entryPoint, 'DIGITAL_MENU');
  assert.equal(entry.customerName, 'Cliente Teste');
  assert.equal(reconcileCashLedger(tenantId, session(), [entry]).reconciled, true);
});

test('refund is negative and reconciles only when aggregate also reflects it', () => {
  const refundedSession = session(); refundedSession.expected.PIX = 0;
  const receipt = createCashLedgerEntry({ id: 'ledger-receipt', tenantId, session: session(), command: command(), snapshot: snapshot(), event: event(), evidenceFingerprint: fingerprint });
  const refund = createCashLedgerEntry({ id: 'ledger-refund', tenantId, session: session(), command: command('REFUND'), snapshot: snapshot(), event: event('REFUND'), evidenceFingerprint: 'b'.repeat(64) });
  assert.equal(refund.netAmountCents, -5000);
  assert.equal(reconcileCashLedger(tenantId, refundedSession, [receipt, refund]).reconciled, true);
});

test('selected payment, delivery and sale facts cannot become cash entries', () => {
  const receive = command();
  assert.throws(() => createCashLedgerEntry({ id: 'ledger-1', tenantId, session: session(), command: { ...receive, operation: { kind: 'CONFIRM' } }, snapshot: snapshot(), event: event(), evidenceFingerprint: fingerprint }), /FINANCIAL_COMMAND_REQUIRED/);
  assert.throws(() => createCashLedgerEntry({ id: 'ledger-1', tenantId, session: session(), command: receive, snapshot: snapshot(), event: { ...event(), fact: 'SALE' }, evidenceFingerprint: fingerprint }), /FACT_MISMATCH/);
});

test('reconciliation rejects duplicate ledger identities and detects drift', () => {
  const entry = createCashLedgerEntry({ id: 'ledger-1', tenantId, session: session(), command: command(), snapshot: snapshot(), event: event(), evidenceFingerprint: fingerprint });
  assert.throws(() => reconcileCashLedger(tenantId, session(), [entry, entry]), /DUPLICATE_ENTRY/);
  const drift = session(); drift.expected.PIX = 4000;
  const result = reconcileCashLedger(tenantId, drift, [entry]);
  assert.equal(result.reconciled, false);
  assert.equal(result.difference.PIX, 1000);
});
