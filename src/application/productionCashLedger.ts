import type { PaymentMethod } from './orderOperations';
import type { CashSession } from './productionFinance';
import type { OperationalCommand, OperationalEvent, OperationalSnapshot } from './productionOrders';

export type CashRail = Exclude<PaymentMethod, 'NOTA'>;
export type CashLedgerKind = 'RECEIPT' | 'REFUND';

/**
 * Immutable financial fact shown in Livro Caixa. A selected payment method,
 * order confirmation or delivery never creates this record by itself.
 */
export interface CashLedgerEntry {
  schema: 1;
  id: string;
  tenantId: string;
  cashSessionId: string;
  orderId: string;
  commandId: string;
  customerId: string;
  customerName: string;
  kind: CashLedgerKind;
  method: CashRail;
  amountCents: number;
  netAmountCents: number;
  source: {
    entryPoint: OperationalSnapshot['canonical']['entryPoint'];
    channel: OperationalSnapshot['canonical']['channel'];
    creationMode: OperationalSnapshot['canonical']['creationMode'];
  };
  occurredAt: string;
  evidenceFingerprint: string;
}

const rails: readonly CashRail[] = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO'];
const validId = (value: string) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(value);

export function createCashLedgerEntry(input: {
  id: string;
  tenantId: string;
  session: CashSession;
  command: OperationalCommand;
  snapshot: OperationalSnapshot;
  event: OperationalEvent;
  evidenceFingerprint: string;
}): CashLedgerEntry {
  const { id, tenantId, session, command, snapshot, event, evidenceFingerprint } = input;
  const operation = command.operation;
  if (operation.kind !== 'RECEIVE' && operation.kind !== 'REFUND') throw new Error('CASH_LEDGER_FINANCIAL_COMMAND_REQUIRED');
  if (session.status !== 'OPEN') throw new Error('CASH_LEDGER_OPEN_SESSION_REQUIRED');
  if (![id, tenantId, session.id, command.commandId, command.orderId, snapshot.customer.id].every(validId)) throw new Error('CASH_LEDGER_ID_INVALID');
  if (!/^[a-f0-9]{64}$/.test(evidenceFingerprint)) throw new Error('CASH_LEDGER_EVIDENCE_INVALID');
  if (command.tenantId !== tenantId || snapshot.canonical.tenantId !== tenantId || event.tenantId !== tenantId || event.orderId !== command.orderId || snapshot.canonical.id !== command.orderId || event.commandId !== command.commandId) throw new Error('CASH_LEDGER_CONTEXT_MISMATCH');
  if (!rails.includes(operation.method) || event.method !== operation.method || event.operation !== operation.kind || event.amountCents !== operation.amountCents || event.amountCents <= 0 || !Number.isSafeInteger(event.amountCents)) throw new Error('CASH_LEDGER_AMOUNT_MISMATCH');
  const kind: CashLedgerKind = operation.kind === 'REFUND' ? 'REFUND' : 'RECEIPT';
  if ((kind === 'REFUND' && event.fact !== 'REFUND') || (kind === 'RECEIPT' && !['RECEIPT', 'CREDIT_RECEIPT'].includes(event.fact))) throw new Error('CASH_LEDGER_FACT_MISMATCH');
  if (!Number.isFinite(Date.parse(event.at)) || event.at !== command.at || !snapshot.customer.name.trim()) throw new Error('CASH_LEDGER_METADATA_INVALID');
  return {
    schema: 1,
    id,
    tenantId,
    cashSessionId: session.id,
    orderId: command.orderId,
    commandId: command.commandId,
    customerId: snapshot.customer.id,
    customerName: snapshot.customer.name,
    kind,
    method: operation.method,
    amountCents: event.amountCents,
    netAmountCents: kind === 'REFUND' ? -event.amountCents : event.amountCents,
    source: {
      entryPoint: snapshot.canonical.entryPoint,
      channel: snapshot.canonical.channel,
      creationMode: snapshot.canonical.creationMode,
    },
    occurredAt: event.at,
    evidenceFingerprint,
  };
}

export interface CashLedgerReconciliation {
  expected: Record<CashRail, number>;
  recorded: Record<CashRail, number>;
  difference: Record<CashRail, number>;
  reconciled: boolean;
}

export function reconcileCashLedger(tenantId: string, session: CashSession, entries: readonly CashLedgerEntry[]): CashLedgerReconciliation {
  const expected = Object.fromEntries(rails.map(method => [method, session.expected[method] ?? 0])) as Record<CashRail, number>;
  const recorded = Object.fromEntries(rails.map(method => [method, 0])) as Record<CashRail, number>;
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.schema !== 1 || entry.tenantId !== tenantId || entry.cashSessionId !== session.id || !rails.includes(entry.method) || !Number.isSafeInteger(entry.netAmountCents) || entry.netAmountCents !== (entry.kind === 'REFUND' ? -entry.amountCents : entry.amountCents)) throw new Error('CASH_LEDGER_ENTRY_INVALID');
    if (ids.has(entry.id)) throw new Error('CASH_LEDGER_DUPLICATE_ENTRY');
    ids.add(entry.id);
    recorded[entry.method] += entry.netAmountCents;
    if (!Number.isSafeInteger(recorded[entry.method])) throw new Error('CASH_LEDGER_TOTAL_OVERFLOW');
  }
  const difference = Object.fromEntries(rails.map(method => [method, recorded[method] - expected[method]])) as Record<CashRail, number>;
  return { expected, recorded, difference, reconciled: rails.every(method => difference[method] === 0) };
}
