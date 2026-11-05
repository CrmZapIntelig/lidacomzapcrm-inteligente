import { createHash } from 'node:crypto';
import type { AtomicJsonPort } from './durableInboundJournal';
import { FirestoreAtomicJsonPort } from './firestoreAtomicPort';
import { StagingFirestoreHttp } from './firestoreHttp';
import { fixtureId } from '../../src/application/stagingOperationalOrders';
import { reviewPilotCheckout, validatePilotCheckout } from '../../src/application/pilotMenuCheckout';
import type { PilotCatalog, PilotCheckoutCommand, PilotConfirmedSnapshot } from '../../src/application/pilotMenuCheckout';
import type { OperationalOrderPersistencePort } from '../../src/application/stagingOperationalOrders';
import type { PilotHandoffOptions } from '../../src/application/pilotCheckoutHandoff';
import { pilotCheckoutOperationalSnapshot, validatePilotHandoffOptions } from '../../src/application/pilotCheckoutHandoff';

export interface PilotCheckoutEnvironment { appEnv: string; projectId: string; pilotOrderWrites?: 'DISABLED' | 'TEST_ONLY' }
function guard(e: PilotCheckoutEnvironment, tenant: string) {
  if (typeof window !== 'undefined' || e.appEnv !== 'staging' || e.projectId !== 'lidacomzapcrm-staging' || e.pilotOrderWrites !== 'TEST_ONLY' || !fixtureId(tenant)) throw new Error('PILOT_ORDER_WRITES_DISABLED');
}
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => [k, stable(value)]));
  return v;
}
interface State {
  schema: 'PILOT_CHECKOUT_TEST_V1'; tenant: string;
  customers: { id: string; identity: string; name: string }[];
  commands: { key: string; commandId: string; digest: string; snapshot: PilotConfirmedSnapshot }[];
  audit: { commandId: string; orderId: string; operation: 'CREATE_TEST'; result: 'APPLIED'; at: string }[];
}
/** Inject the existing atomic port. No SDK, credential discovery, cloud factory or public endpoint.
 * This bounded TEST aggregate is not a production orders/client persistence adapter. */
export class PilotCheckoutTestStore {
  private enabled = true;
  private readonly environment: PilotCheckoutEnvironment;
  constructor(private readonly port: AtomicJsonPort, environment: PilotCheckoutEnvironment, private readonly tenant: string) { guard(environment, tenant); this.environment = { ...environment }; }
  disable() { this.enabled = false; }
  /** The checkout receipt stays immutable. Only the existing order store owns subsequent operational state.
   * Two stores are not a distributed transaction: retry uses one deterministic destination command. */
  async handoff(commandId: string, destination: OperationalOrderPersistencePort, options: PilotHandoffOptions) {
    const requireEnabled = () => { guard(this.environment, this.tenant); if (!this.enabled) throw new Error('PILOT_ORDER_WRITES_DISABLED'); };
    requireEnabled(); validatePilotHandoffOptions(options);
    if (typeof commandId !== 'string' || !fixtureId(commandId)) throw new Error('PILOT_HANDOFF_COMMAND_INVALID');
    if (destination.tenantId !== this.tenant) throw new Error('PILOT_HANDOFF_TENANT_MISMATCH');
    const settings = structuredClone(options);
    const inspect = (raw: string | undefined) => {
      requireEnabled();
      if (raw === undefined) throw new Error('PILOT_HANDOFF_NOT_FOUND');
      const state: State = JSON.parse(raw);
      if (state.schema !== 'PILOT_CHECKOUT_TEST_V1' || state.tenant !== this.tenant || !Array.isArray(state.commands) || !Array.isArray(state.customers)) throw new Error('PILOT_STORE_CONTEXT_MISMATCH');
      const matches = state.commands.filter(c => c.commandId === commandId);
      if (!matches.length) throw new Error('PILOT_HANDOFF_NOT_FOUND');
      if (matches.length !== 1) throw new Error('PILOT_HANDOFF_AMBIGUOUS');
      const saved = matches[0];
      if (!fixtureId(saved.key) || !/^[a-f0-9]{64}$/.test(saved.digest) || state.commands.filter(c => c.key === saved.key).length !== 1) throw new Error('PILOT_HANDOFF_RECEIPT_INVALID');
      const order = saved.snapshot.legacy;
      if (order.id !== `demo-TEST-pilot-${hash(this.tenant + '\0' + saved.key).slice(0, 32)}` || order.clientId !== `demo-TEST-contact-${hash(this.tenant + '\0' + order.clientPhone).slice(0, 32)}` || state.customers.filter(c => c.id === order.clientId && c.identity === order.clientPhone).length !== 1) throw new Error('PILOT_HANDOFF_IDENTITY_MISMATCH');
      return { value: raw, result: structuredClone(saved.snapshot) };
    };
    const receipt = await (this.port.read ? this.port.read(raw => inspect(raw).result) : this.port.transaction(inspect));
    requireEnabled();
    const snapshot = pilotCheckoutOperationalSnapshot(receipt, this.tenant, commandId, settings);
    const handoffId = `demo-TEST-handoff-${hash(this.tenant + '\0' + commandId).slice(0, 32)}`;
    return destination.execute({ commandId: handoffId, idempotencyKey: handoffId, tenantId: this.tenant, orderId: snapshot.canonical.id, expectedRevision: 0, actor: settings.actor, at: snapshot.canonical.createdAt.toISOString(), operation: { kind: 'CREATE', snapshot } });
  }
  async create(command: PilotCheckoutCommand, catalog: PilotCatalog, at: string) {
    guard(this.environment, this.tenant); if (!this.enabled) throw new Error('PILOT_ORDER_WRITES_DISABLED');
    validatePilotCheckout(command);
    if (![command.commandId, command.idempotencyKey, command.menuId, command.catalogRevision, ...(command.conversationId ? [command.conversationId] : [])].every(fixtureId)
      || !/^TEST-[A-Za-z0-9_-]{1,100}$/.test(command.customer.identity) || !/^Cliente TEST [A-Za-z0-9 _-]{1,100}$/.test(command.customer.name)
      || command.address && Object.values(command.address).some(v => !/^TEST[ A-Za-z0-9_-]*$/.test(v))
      || command.lines.some(l => !fixtureId(l.productId) || !/^TEST(?:[ A-Za-z0-9_-]*)$/.test(l.observation))) throw new Error('PILOT_TEST_DATA_REQUIRED');
    const input = structuredClone(command), trusted = structuredClone(catalog), digest = hash(JSON.stringify(stable(input)));
    if (!fixtureId(trusted.menu.id) || !fixtureId(trusted.revision) || !/^TEST /.test(trusted.menu.name)
      || trusted.products.some(p => !fixtureId(p.id) || !/^TEST /.test(p.name) || p.tamanhos.some(s => !/^TEST/.test(s.label)) || [...p.adicionais, ...p.utensilios].some(a => !fixtureId(a.id) || !/^TEST /.test(a.name)))) throw new Error('PILOT_TEST_CATALOG_REQUIRED');
    return this.port.transaction(raw => {
      guard(this.environment, this.tenant); if (!this.enabled) throw new Error('PILOT_ORDER_WRITES_DISABLED');
      const state: State = raw === undefined ? { schema: 'PILOT_CHECKOUT_TEST_V1', tenant: this.tenant, customers: [], commands: [], audit: [] } : JSON.parse(raw);
      if (state.schema !== 'PILOT_CHECKOUT_TEST_V1' || state.tenant !== this.tenant || !Array.isArray(state.customers) || !Array.isArray(state.commands) || !Array.isArray(state.audit)) throw new Error('PILOT_STORE_CONTEXT_MISMATCH');
      const old = state.commands.find(c => c.key === input.idempotencyKey || c.commandId === input.commandId);
      if (old) { if (old.digest !== digest || old.key !== input.idempotencyKey || old.commandId !== input.commandId) throw new Error('PILOT_IDEMPOTENCY_CONFLICT'); return { value: raw!, result: { snapshot: structuredClone(old.snapshot), replay: true } }; }
      if (state.commands.length >= 100 || state.customers.length >= 100) throw new Error('PILOT_TEST_CAPACITY');
      const customer = state.customers.find(c => c.identity === input.customer.identity);
      const clientId = customer?.id ?? `demo-TEST-contact-${hash(this.tenant + '\0' + input.customer.identity).slice(0, 32)}`;
      const snapshot = reviewPilotCheckout(input, trusted, { orderId: `demo-TEST-pilot-${hash(this.tenant + '\0' + input.idempotencyKey).slice(0, 32)}`, clientId, restaurant: 'Restaurante TEST Exemplo', at });
      // No totalBought, lastPurchaseDate, message, SALE, RECEIPT, KDS or cash mutation.
      if (!customer) state.customers.push({ id: clientId, identity: input.customer.identity, name: input.customer.name });
      state.commands.push({ key: input.idempotencyKey, commandId: input.commandId, digest, snapshot });
      state.audit.push({ commandId: input.commandId, orderId: snapshot.legacy.id, operation: 'CREATE_TEST', result: 'APPLIED', at });
      const value = JSON.stringify(state); if (Buffer.byteLength(value, 'utf8') > 256 * 1024) throw new Error('PILOT_TEST_CAPACITY');
      return { value, result: { snapshot: structuredClone(snapshot), replay: false } };
    });
  }
}

/** Dedicated receipt aggregate, physically separate from orders and inbound journal. No I/O at construction. */
export function createFirestoreCheckoutPort(environment: PilotCheckoutEnvironment, tenantId: string, freshAccessToken: () => Promise<string>): AtomicJsonPort {
  guard(environment, tenantId);
  return new FirestoreAtomicJsonPort(new StagingFirestoreHttp(environment, freshAccessToken, 'stg_pilot_checkout'), tenantId, '200', 'stg_pilot_checkout');
}
