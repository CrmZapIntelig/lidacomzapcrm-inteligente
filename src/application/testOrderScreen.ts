import { fixtureId } from './stagingOperationalOrders';
import { testOrderOperationCapabilities } from './testOrderAccess';
import type { TestOrderClient, TestOrderOperation, TestOrderPage, TestOrderReply, TestOrderRequest, TestOrderRow } from './testOrderAccess';
import type { PrintSnapshot } from './operationsFinance';

export interface TestOrderScreenState {
  orders: TestOrderRow[]; loading: boolean; busy: boolean; message: string;
  retryAvailable: boolean; document: PrintSnapshot | null;
}
function validateRow(row: TestOrderRow) {
  if (!row || row.mode !== 'TEST' || typeof row.id !== 'string' || !fixtureId(row.id) || !Number.isSafeInteger(row.revision) || row.revision < 1 || typeof row.customerName !== 'string' || !Number.isSafeInteger(row.totalCents) || row.totalCents < 0 || !Number.isSafeInteger(row.receivedCents) || row.receivedCents < 0 || row.receivedCents > row.totalCents || !Array.isArray(row.items) || row.items.length > 20 || !Array.isArray(row.actions) || row.actions.some(a => !Object.hasOwn(testOrderOperationCapabilities, a)) || typeof row.canPrint !== 'boolean') throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
}
/** UI lifecycle only; authorization and mutations remain in the injected server boundary. */
export class TestOrderScreen {
  private state: TestOrderScreenState = { orders: [], loading: false, busy: false, message: '', retryAvailable: false, document: null };
  private listeners = new Set<() => void>();
  private disposed = false;
  private pending: TestOrderRequest | null = null;
  private readonly context: Pick<TestOrderClient, 'contextKey' | 'tenantId' | 'actorId'>;
  constructor(private readonly client: TestOrderClient, private readonly newId = () => `demo-TEST-ui-${globalThis.crypto.randomUUID()}`, private readonly now = () => new Date().toISOString()) {
    this.context = { contextKey: client.contextKey, tenantId: client.tenantId, actorId: client.actorId };
    if (!client.contextKey || !fixtureId(client.tenantId) || !fixtureId(client.actorId)) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
  }
  get snapshot(): TestOrderScreenState { return structuredClone(this.state); }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  dispose() { this.disposed = true; this.pending = null; this.state = { orders: [], loading: false, busy: false, message: '', retryAvailable: false, document: null }; this.listeners.clear(); }
  private publish(update: Partial<TestOrderScreenState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...update }; for (const listener of this.listeners) listener();
  }
  private checkContext(reply: Pick<TestOrderPage, 'mode' | 'tenantId' | 'actorId'>) {
    if (reply?.mode !== 'TEST' || reply.tenantId !== this.context.tenantId || reply.actorId !== this.context.actorId || this.client.contextKey !== this.context.contextKey || this.client.tenantId !== this.context.tenantId || this.client.actorId !== this.context.actorId) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
  }
  private async reload() {
    const page = await this.client.list(); if (this.disposed) return;
    this.checkContext(page);
    if (!Array.isArray(page.orders) || page.orders.length > 30 || new Set(page.orders.map(o => o.id)).size !== page.orders.length) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
    page.orders.forEach(validateRow); this.publish({ orders: structuredClone(page.orders), document: null });
  }
  async load() {
    if (this.disposed || this.state.busy || this.state.loading || this.pending) return;
    this.publish({ loading: true, message: '', document: null });
    try { await this.reload(); }
    catch { this.publish({ orders: [], message: 'Não foi possível carregar os pedidos de teste. Verifique o acesso e tente atualizar.' }); }
    finally { this.publish({ loading: false }); }
  }
  async execute(orderId: string, operation: TestOrderOperation) {
    if (this.disposed || this.state.busy || this.state.loading || this.pending) return;
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order || !order.actions.includes(operation.kind)) { this.publish({ message: 'Esta ação não está disponível para o pedido e o acesso atuais.' }); return; }
    const id = this.newId();
    this.pending = { commandId: id, idempotencyKey: id, orderId, expectedRevision: order.revision, at: this.now(), operation: structuredClone(operation) };
    await this.sendPending();
  }
  async retry() { if (!this.disposed && this.pending && !this.state.busy) await this.sendPending(); }
  private async sendPending() {
    if (!this.pending) return;
    const request = structuredClone(this.pending);
    this.publish({ busy: true, retryAvailable: false, message: '', document: null });
    try {
      const result: TestOrderReply = await this.client.execute(structuredClone(request)); if (this.disposed) return;
      this.checkContext(result); validateRow(result.current);
      if (result.current.id !== request.orderId || !Number.isSafeInteger(result.appliedRevision) || result.appliedRevision !== request.expectedRevision + 1 || result.current.revision < result.appliedRevision) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
      this.pending = null;
      this.publish({ orders: this.state.orders.map(o => o.id === result.current.id ? structuredClone(result.current) : o), message: result.replay ? 'Ação já registrada. O estado atual foi recuperado.' : 'Pedido de teste atualizado.' });
    } catch (error) {
      if (this.disposed) return;
      const code = error instanceof Error ? error.message : '';
      if (/^ORDER_(ACCESS_|VIEW_CONTEXT_|STAGING_WRITES_)/.test(code)) {
        this.pending = null; this.publish({ orders: [], message: 'Acesso indisponível. Atualize os pedidos após verificar a sessão.' });
      } else if (code === 'ORDER_REVISION_CONFLICT' || code === 'ORDER_TIMESTAMP_REGRESSION') {
        this.pending = null;
        try { await this.reload(); this.publish({ message: 'O pedido mudou em outra tela. Revise o estado atualizado antes de agir.' }); }
        catch { this.publish({ orders: [], message: 'O pedido mudou. Não foi possível recarregar seu estado atual.' }); }
      } else if (/^ORDER_[A-Z_]+$/.test(code)) {
        this.pending = null;
        // Domain rejections may follow another operator's changes; discard the obsolete view.
        try { await this.reload(); } catch { this.publish({ orders: [] }); }
        this.publish({ message: 'A ação foi recusada. Revise o pedido antes de tentar novamente.' });
      } else {
        this.publish({ retryAvailable: true, message: 'A resposta não chegou. Use Repetir ação para consultar o mesmo registro sem duplicá-lo.' });
      }
    } finally { this.publish({ busy: false }); }
  }
  async print(orderId: string) {
    if (this.disposed || this.state.busy || this.state.loading || this.pending) return;
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order?.canPrint) return;
    this.publish({ busy: true, message: '', document: null });
    try {
      const document = await this.client.print(orderId, order.revision); if (this.disposed) return;
      this.checkContext({ mode: 'TEST', tenantId: this.context.tenantId, actorId: this.context.actorId });
      if (document.version !== 1 || document.mode !== 'SIMULATION' || document.kind !== 'PEDIDO' || document.reference !== orderId || !Array.isArray(document.lines) || document.lines.some(l => typeof l !== 'string')) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
      this.publish({ document: structuredClone(document) });
    } catch (error) {
      if (this.disposed) return;
      if (error instanceof Error && error.message === 'ORDER_REVISION_CONFLICT') {
        try { await this.reload(); } catch { this.publish({ orders: [] }); }
        this.publish({ message: 'O pedido mudou. Confira os dados atuais e abra o documento novamente.' });
      } else { this.publish({ orders: [], message: 'Documento indisponível. Atualize os pedidos para verificar o acesso.' }); }
    } finally { this.publish({ busy: false }); }
  }
  closeDocument() { this.publish({ document: null }); }
}
