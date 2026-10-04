import { createHash } from 'node:crypto';
import type { AtomicJsonPort } from './durableInboundJournal';
import { FirestoreAtomicJsonPort } from './firestoreAtomicPort';
import { StagingFirestoreHttp } from './firestoreHttp';
import { applyOrderCommand, fixtureId, validateCommand, validateSnapshot } from '../../src/application/stagingOperationalOrders';
import type { OperationalCommand, OperationalSnapshot, OperationalEvent, OperationalOrderPersistencePort, OperationalCommandResult } from '../../src/application/stagingOperationalOrders';
import { projectTestConsumers, projectTestCash } from '../../src/application/operationalOrderProjections';

export interface OrderEnvironment { appEnv: string; projectId: string; operationalOrderWrites?: 'DISABLED' | 'TEST_ONLY' }
export function requireOrderEnvironment(environment: OrderEnvironment, tenantId: string) {
  if (typeof window !== 'undefined' || environment.appEnv !== 'staging' || environment.projectId !== 'lidacomzapcrm-staging' || environment.operationalOrderWrites !== 'TEST_ONLY' || !fixtureId(tenantId)) throw new Error('ORDER_STAGING_WRITES_DISABLED');
}
type Result = OperationalCommandResult;
interface State {
  schema: 1; tenantId: string; records: OperationalSnapshot[]; events: OperationalEvent[]; audit: OperationalEvent[];
  commands: { commandId: string; key: string; orderId: string; hash: string; result: Result; rolledBack: boolean }[];
  projections: ReturnType<typeof projectTestConsumers>[]; cash: ReturnType<typeof projectTestCash>;
}
function stable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  return value;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
function revive(snapshot: OperationalSnapshot) {
  snapshot.canonical.createdAt = new Date(snapshot.canonical.createdAt); snapshot.canonical.updatedAt = new Date(snapshot.canonical.updatedAt); return snapshot;
}
function validateEvent(event: OperationalEvent, tenantId: string) {
  const allowed = ['id', 'commandId', 'actor', 'orderId', 'tenantId', 'revision', 'previousVersion', 'newVersion', 'at', 'operation', 'result', 'fact', 'amountCents', 'method', 'evidenceId'];
  if (Object.keys(event).some(k => !allowed.includes(k)) || event.tenantId !== tenantId || ![event.id, event.commandId, event.actor, event.orderId].every(fixtureId) || event.evidenceId !== undefined && !fixtureId(event.evidenceId) || event.result !== 'APPLIED' || !Number.isSafeInteger(event.amountCents) || event.amountCents < 0 || !['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'NOTA'].includes(event.method) || !['STATE', 'SALE', 'SALE_VOID', 'RECEIPT', 'CREDIT_RECEIPT', 'REFUND'].includes(event.fact) || !Number.isSafeInteger(event.previousVersion) || event.previousVersion < 0 || event.newVersion !== event.previousVersion + 1 || event.revision !== event.newVersion) throw new Error('ORDER_STORE_AUDIT_INVALID');
  validateCommand({ commandId: event.commandId, idempotencyKey: event.commandId, actor: event.actor, tenantId, orderId: event.orderId, at: event.at, expectedRevision: event.previousVersion, operation: { kind: event.operation } as OperationalCommand['operation'] });
}
export class StagingOperationalOrderStore implements OperationalOrderPersistencePort {
  private enabled = true;
  private readonly environment: OrderEnvironment;
  constructor(private readonly port: AtomicJsonPort, environment: OrderEnvironment, readonly tenantId: string) {
    requireOrderEnvironment(environment, tenantId); this.environment = { ...environment };
  }
  disable() { this.enabled = false; }
  private guard() { if (!this.enabled) throw new Error('ORDER_STAGING_WRITES_DISABLED'); requireOrderEnvironment(this.environment, this.tenantId); }
  private async transaction<T>(fn: (state: State) => T): Promise<T> {
    this.guard();
    return this.port.transaction(raw => {
      const state: State = raw === undefined ? { schema: 1, tenantId: this.tenantId, records: [], events: [], audit: [], commands: [], projections: [], cash: projectTestCash([]) } : JSON.parse(raw);
      if (state.schema !== 1 || state.tenantId !== this.tenantId || !Array.isArray(state.records) || !Array.isArray(state.events) || !Array.isArray(state.audit) || !Array.isArray(state.commands)) throw new Error('ORDER_STORE_CONTEXT_MISMATCH');
      if (Object.keys(state).some(k => !['schema', 'tenantId', 'records', 'events', 'audit', 'commands', 'projections', 'cash'].includes(k))) throw new Error('ORDER_STORE_UNSUPPORTED_FIELD');
      for (const s of state.records) { revive(s); validateSnapshot(s, this.tenantId); }
      if (new Set(state.records.map(s => s.canonical.id)).size !== state.records.length) throw new Error('ORDER_STORE_DUPLICATE_RECORD');
      for (const e of [...state.events, ...state.audit]) validateEvent(e, this.tenantId);
      if (new Set(state.events.map(e => e.id)).size !== state.events.length || new Set(state.audit.map(e => e.id)).size !== state.audit.length) throw new Error('ORDER_STORE_DUPLICATE_EVENT');
      for (const c of state.commands) {
        if (![c.commandId, c.key, c.orderId].every(fixtureId) || !/^[a-f0-9]{64}$/.test(c.hash) || typeof c.rolledBack !== 'boolean' || !Number.isSafeInteger(c.result.revision) || c.result.revision < 1) throw new Error('ORDER_STORE_COMMAND_INVALID');
        if (c.result.snapshot) { revive(c.result.snapshot); validateSnapshot(c.result.snapshot, this.tenantId); if (c.result.snapshot.canonical.id !== c.orderId) throw new Error('ORDER_STORE_COMMAND_INVALID'); }
      }
      const result = fn(state);
      if (state.records.length > 30 || state.commands.length > 300 || state.events.length > 300 || state.audit.length > 300) throw new Error('ORDER_STORE_TEST_CAPACITY');
      state.projections = state.records.map(projectTestConsumers); state.cash = projectTestCash(state.events.filter(e => e.operation !== 'ROLLBACK_TEST'));
      const value = JSON.stringify(state);
      if (Buffer.byteLength(value, 'utf8') > 256 * 1024) throw new Error('ORDER_STORE_TEST_CAPACITY');
      return { value, result: structuredClone(result) };
    });
  }
  async get(orderId: string): Promise<OperationalSnapshot | undefined> {
    if (!fixtureId(orderId)) throw new Error('ORDER_TEST_ID_REQUIRED');
    return this.transaction(state => state.records.find(s => s.canonical.id === orderId));
  }
  async snapshot() { return this.transaction(state => ({ records: state.records, events: state.events, audit: state.audit, projections: state.records.map(projectTestConsumers), cash: projectTestCash(state.events.filter(e => e.operation !== 'ROLLBACK_TEST')) })); }
  async execute(command: OperationalCommand): Promise<Result> {
    this.guard(); validateCommand(command);
    if (command.tenantId !== this.tenantId) throw new Error('ORDER_COMMAND_TENANT_MISMATCH');
    if (command.operation.kind === 'CREATE' || command.operation.kind === 'UPDATE') validateSnapshot(command.operation.snapshot, this.tenantId);
    const copy = structuredClone(command), fingerprint = hash(copy);
    return this.transaction(state => {
      const previous = state.commands.find(c => c.commandId === copy.commandId || c.key === copy.idempotencyKey);
      if (previous) {
        if (previous.hash !== fingerprint) throw new Error('ORDER_IDEMPOTENCY_CONFLICT');
        if (previous.rolledBack) throw new Error('ORDER_COMMAND_ROLLED_BACK');
        return { ...previous.result, replay: true };
      }
      const current = state.records.find(s => s.canonical.id === copy.orderId);
      if (current && Date.parse(copy.at) < current.canonical.updatedAt.getTime()) throw new Error('ORDER_TIMESTAMP_REGRESSION');
      let result: Result;
      if (copy.operation.kind === 'ROLLBACK_TEST') {
        if (!current || current.revision !== copy.expectedRevision) throw new Error('ORDER_REVISION_CONFLICT');
        state.records = state.records.filter(s => s.canonical.id !== copy.orderId);
        state.events = state.events.filter(e => e.orderId !== copy.orderId);
        for (const c of state.commands) if (c.orderId === copy.orderId) c.rolledBack = true;
        state.events.push({ id: copy.commandId, commandId: copy.commandId, actor: copy.actor, orderId: copy.orderId, tenantId: copy.tenantId, revision: current.revision + 1, previousVersion: current.revision, newVersion: current.revision + 1, at: copy.at, operation: 'ROLLBACK_TEST', result: 'APPLIED', fact: 'STATE', amountCents: 0, method: current.method });
        result = { revision: current.revision + 1, snapshot: null, replay: false };
      } else {
        const op = copy.operation;
        if ((op.kind === 'RECEIVE' || op.kind === 'REFUND') && state.events.some(e => e.evidenceId === op.evidenceId)) throw new Error('ORDER_DUPLICATE_FINANCIAL_EVIDENCE');
        const mutation = applyOrderCommand(current, copy);
        state.records = [...state.records.filter(s => s.canonical.id !== copy.orderId), mutation.snapshot]; state.events.push(mutation.event);
        result = { revision: mutation.snapshot.revision, snapshot: mutation.snapshot, replay: false };
      }
      state.audit.push(structuredClone(state.events[state.events.length - 1]));
      state.commands.push({ commandId: copy.commandId, key: copy.idempotencyKey, hash: fingerprint, orderId: copy.orderId, result: structuredClone(result), rolledBack: false });
      return result;
    });
  }
}
/** Guard executes before construction and before the injected fresh credential resolver. */
export function createFirestoreOrderStore(environment: OrderEnvironment, tenantId: string, freshAccessToken: () => Promise<string>) {
  requireOrderEnvironment(environment, tenantId);
  const http = new StagingFirestoreHttp(environment, freshAccessToken, 'stg_operational_orders');
  return new StagingOperationalOrderStore(new FirestoreAtomicJsonPort(http, tenantId, '200', 'stg_operational_orders'), environment, tenantId);
}
