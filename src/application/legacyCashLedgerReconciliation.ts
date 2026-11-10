import { createCashLedgerEntry } from './productionCashLedger';
import type { CashSession } from './productionFinance';
import type { OperationalEvent, OperationalSnapshot, OperationalCommand } from './productionOrders';

/** Caller must read these artifacts from authenticated storage in one transaction.
 * Reconstructs a ledger fact only; never changes payment, order or cash totals. */
export function reconstructLegacyCashEntry(input: {
  id: string; evidenceFingerprint: string; tenantId: string; session: CashSession;
  /** Only for the authenticated dedicated single-tenant database predating evidence.tenantId. */
  legacyDedicatedDatabase?: 'lidacomzapcrm-work-20261021';
  snapshot: OperationalSnapshot;
  event: OperationalEvent & { cashSessionId?: string; confirmation?: string };
  commandRecord: { revision: number; actor: string; fingerprint: string };
  evidenceRecord: { tenantId?: string; orderId: string; commandId: string; actor: string; kind: string };
}) {
  const { event, commandRecord: command, evidenceRecord: proof, snapshot, session, tenantId } = input;
  if (!['RECEIVE', 'REFUND'].includes(event.operation) || event.result !== 'APPLIED'
    || event.confirmation !== 'MANUAL_OPERATOR' || event.cashSessionId !== session.id
    || event.id !== event.commandId || event.revision !== command.revision
    || event.newVersion !== event.revision || event.previousVersion !== event.revision - 1
    || !Number.isSafeInteger(event.revision) || event.revision < 1
    || snapshot.revision < event.revision || command.actor !== event.actor
    || !command.fingerprint || !event.evidenceId || !event.method
    || event.method === 'NOTA' || !event.actor
    || (proof.tenantId !== tenantId && !(proof.tenantId === undefined
      && input.legacyDedicatedDatabase === 'lidacomzapcrm-work-20261021' && tenantId === 'prato-mineiro'))
    || proof.orderId !== event.orderId
    || proof.commandId !== event.commandId || proof.actor !== event.actor || proof.kind !== event.operation
    || !Number.isFinite(Date.parse(session.openedAt)) || Date.parse(event.at) < Date.parse(session.openedAt)) {
    throw new Error('LEGACY_CASH_EVIDENCE_MISMATCH');
  }
  const reconstructed: OperationalCommand = {
    commandId: event.commandId, idempotencyKey: event.commandId, tenantId,
    orderId: event.orderId, expectedRevision: event.previousVersion, actor: event.actor, at: event.at,
    operation: { kind: event.operation as 'RECEIVE' | 'REFUND', method: event.method,
      amountCents: event.amountCents!, evidenceId: event.evidenceId },
  };
  return createCashLedgerEntry({ ...input, command: reconstructed });
}
