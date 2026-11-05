import type { AtomicJsonPort } from './durableInboundJournal';
import { requireOrderEnvironment, StagingOperationalOrderStore } from './operationalOrderStore';
import type { OrderEnvironment } from './operationalOrderStore';
import { fixtureId, validateCommand } from '../../src/application/stagingOperationalOrders';
import { operationalOrderPrint } from '../../src/application/operationalOrderProjections';
import { testOrderCapabilities, testOrderOperationCapabilities, testOrderRow } from '../../src/application/testOrderAccess';
import type { TestCheckoutImportRequest, TestOrderCapability, TestOrderPage, TestOrderReply, TestOrderRequest } from '../../src/application/testOrderAccess';
import { PilotCheckoutTestStore } from './pilotCheckoutStore';
import type { PilotCheckoutEnvironment } from './pilotCheckoutStore';
import type { OrderCreationMode } from '../../src/domain/types';
import { validatePilotHandoffOptions } from '../../src/application/pilotCheckoutHandoff';

/** Server configuration for a known checkout workflow, never request data. */
export interface TestCheckoutBinding {
  port: AtomicJsonPort;
  environment: PilotCheckoutEnvironment;
  creationMode: OrderCreationMode;
}

export interface VerifiedTestOrderPrincipal {
  mode: 'TEST'; tenantId: string; actorId: string; expiresAt: number;
  capabilities: readonly TestOrderCapability[];
}
/** The future HTTP boundary MUST authenticate and verify this resolver server-side.
 * No factory, endpoint, role defaults, credentials or cloud connection is installed here. */
export class TestOrderAccessService {
  private enabled = true;
  private readonly environment: OrderEnvironment;
  private readonly checkout?: TestCheckoutBinding;
  constructor(private readonly port: AtomicJsonPort, environment: OrderEnvironment, private readonly tenantId: string,
    private readonly resolvePrincipal: () => Promise<VerifiedTestOrderPrincipal | null>, private readonly now = Date.now, checkout?: TestCheckoutBinding) {
    requireOrderEnvironment(environment, tenantId); this.environment = { ...environment };
    if (checkout) {
      if (checkout.port === port) throw new Error('ORDER_ACCESS_CHECKOUT_PORT_INVALID');
      validatePilotHandoffOptions({ actor: 'demo-TEST-binding-validation', creationMode: checkout.creationMode });
      this.checkout = { port: checkout.port, environment: { ...checkout.environment }, creationMode: checkout.creationMode };
      // Validate TEST configuration without reading or writing either aggregate.
      new PilotCheckoutTestStore(this.checkout.port, this.checkout.environment, tenantId);
    }
  }
  disable() { this.enabled = false; }
  private guard() {
    if (!this.enabled) throw new Error('ORDER_ACCESS_DISABLED');
    requireOrderEnvironment(this.environment, this.tenantId);
  }
  private check(principal: VerifiedTestOrderPrincipal, required: readonly TestOrderCapability[]) {
    this.guard();
    const time = this.now();
    if (!principal || typeof principal !== 'object' || Object.keys(principal).some(k => !['mode', 'tenantId', 'actorId', 'expiresAt', 'capabilities'].includes(k)) || principal.mode !== 'TEST' || principal.tenantId !== this.tenantId || typeof principal.actorId !== 'string' || !fixtureId(principal.actorId) || !Number.isFinite(principal.expiresAt) || !Number.isFinite(time) || !Array.isArray(principal.capabilities) || principal.capabilities.some(c => !testOrderCapabilities.includes(c)) || new Set(principal.capabilities).size !== principal.capabilities.length) throw new Error('ORDER_ACCESS_DENIED');
    if (principal.expiresAt <= time) throw new Error('ORDER_ACCESS_EXPIRED');
    if (required.some(c => !principal.capabilities.includes(c))) throw new Error('ORDER_ACCESS_DENIED');
  }
  private async scope(required: readonly TestOrderCapability[]) {
    this.guard();
    // Snapshot the trusted context; mutations while a transaction waits cannot grant privileges.
    const principal = structuredClone(await this.resolvePrincipal());
    if (!principal) throw new Error('ORDER_ACCESS_DENIED');
    const check = () => this.check(principal, ['orders.read', ...required]);
    check();
    const protect = (port: AtomicJsonPort): AtomicJsonPort => {
      const protectedPort: AtomicJsonPort = { transaction: async update => {
      check();
      const result = await port.transaction(raw => { check(); const next = update(raw); check(); return next; });
      check(); return result;
      } };
      if (port.read) protectedPort.read = async inspect => {
        check();
        const result = await port.read!(raw => { check(); const value = inspect(raw); check(); return value; });
        check(); return result;
      };
      return protectedPort;
    };
    return { principal, check, protect, store: new StagingOperationalOrderStore(protect(this.port), this.environment, this.tenantId) };
  }
  async importCheckout(request: TestCheckoutImportRequest): Promise<TestOrderReply> {
    this.guard();
    if (!this.checkout) throw new Error('ORDER_ACCESS_CHECKOUT_DISABLED');
    const copy = structuredClone(request);
    if (!copy || typeof copy !== 'object' || Array.isArray(copy) || Object.keys(copy).some(k => !['checkoutCommandId', 'cardMethod'].includes(k)) || typeof copy.checkoutCommandId !== 'string' || !fixtureId(copy.checkoutCommandId) || copy.cardMethod !== undefined && !['DEBITO', 'CREDITO'].includes(copy.cardMethod)) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
    const scope = await this.scope(['orders.checkout.import']);
    const source = new PilotCheckoutTestStore(scope.protect(this.checkout.port), this.checkout.environment, this.tenantId);
    const result = await source.handoff(copy.checkoutCommandId, scope.store, {
      actor: scope.principal.actorId, creationMode: this.checkout.creationMode,
      ...(copy.cardMethod !== undefined ? { cardMethod: copy.cardMethod } : {}),
    });
    if (!result.snapshot) throw new Error('ORDER_ACCESS_NOT_FOUND');
    // The immutable receipt can replay revision 1 after the operational order has advanced.
    const current = await scope.store.get(result.snapshot.canonical.id);
    if (!current) throw new Error('ORDER_ACCESS_NOT_FOUND');
    scope.check();
    return { mode: 'TEST', tenantId: this.tenantId, actorId: scope.principal.actorId, appliedRevision: result.revision, replay: result.replay, current: testOrderRow(current, scope.principal.capabilities) };
  }
  async list(): Promise<TestOrderPage> {
    const scope = await this.scope([]), state = await scope.store.snapshot();
    scope.check();
    return { mode: 'TEST', tenantId: this.tenantId, actorId: scope.principal.actorId, orders: state.records.map(s => testOrderRow(s, scope.principal.capabilities)) };
  }
  async execute(request: TestOrderRequest): Promise<TestOrderReply> {
    this.guard();
    const copy = structuredClone(request);
    if (!copy || typeof copy !== 'object' || Object.keys(copy).some(k => !['commandId', 'idempotencyKey', 'orderId', 'expectedRevision', 'at', 'operation'].includes(k)) || !copy.operation || !Object.hasOwn(testOrderOperationCapabilities, copy.operation.kind)) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
    const scope = await this.scope([testOrderOperationCapabilities[copy.operation.kind]]);
    // Tenant and audit actor come exclusively from the trusted context, never the browser.
    const command = { ...copy, tenantId: this.tenantId, actor: scope.principal.actorId };
    validateCommand(command);
    const result = await scope.store.execute(command);
    // A replay may carry an old snapshot. Read the current order before returning to the screen.
    const current = await scope.store.get(copy.orderId);
    if (!current) throw new Error('ORDER_ACCESS_NOT_FOUND');
    scope.check();
    return { mode: 'TEST', tenantId: this.tenantId, actorId: scope.principal.actorId, appliedRevision: result.revision, replay: result.replay, current: testOrderRow(current, scope.principal.capabilities) };
  }
  async print(orderId: string, expectedRevision: number) {
    const scope = await this.scope(['orders.print']);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new Error('ORDER_ACCESS_REQUEST_INVALID');
    const current = await scope.store.get(orderId);
    if (!current) throw new Error('ORDER_ACCESS_NOT_FOUND');
    if (current.revision !== expectedRevision) throw new Error('ORDER_REVISION_CONFLICT');
    scope.check(); return operationalOrderPrint(current, 'PEDIDO');
  }
}
