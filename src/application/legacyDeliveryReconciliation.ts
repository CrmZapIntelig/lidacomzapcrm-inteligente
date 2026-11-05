import type { OperationalEvent, OperationalSnapshot } from './productionOrders';

/** Only a trusted event reader may supply terminal evidence. Old DELIVERY events lack this field. */
export type DeliveryAuditEvidence = OperationalEvent & { deliveryState?: OperationalSnapshot['deliveryState'] };
type DeliveryOrder = Pick<OperationalSnapshot, 'canonical' | 'revision' | 'deliveryState' | 'deliveredAt'>;

/** Read-only proposals. A future writer must compare revision and record an audit trail atomically. */
export function planLegacyDeliveryReconciliation(tenantId: string, orders: readonly DeliveryOrder[], events: readonly DeliveryAuditEvidence[]) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(tenantId)) throw new Error('DELIVERY_RECONCILIATION_TENANT_INVALID');
  if (orders.some(o => o.canonical.tenantId !== tenantId) || events.some(e => e.tenantId !== tenantId)) throw new Error('DELIVERY_RECONCILIATION_TENANT_INVALID');
  if (new Set(orders.map(o => o.canonical.id)).size !== orders.length) throw new Error('DELIVERY_RECONCILIATION_DUPLICATE_ORDER');
  return orders.filter(o => o.deliveryState === 'DELIVERED' && !o.deliveredAt).map(order => {
    const scope = { tenantId, orderId: order.canonical.id, expectedRevision: order.revision };
    const createdAt = new Date(order.canonical.createdAt).getTime();
    const updatedAt = new Date(order.canonical.updatedAt).getTime();
    if (!Number.isSafeInteger(order.revision) || order.revision < 1 || !Number.isFinite(createdAt) || !Number.isFinite(updatedAt) || updatedAt < createdAt) return { ...scope, status: 'INVALID_EVIDENCE' as const };
    const terminal = events.filter(e => e.orderId === order.canonical.id && e.operation === 'DELIVERY' && e.result === 'APPLIED' && e.deliveryState === 'DELIVERED');
    if (!terminal.length) return { ...scope, status: 'MISSING_TERMINAL_EVIDENCE' as const };
    const invalid = terminal.some(e => !e.id || !e.commandId || !Number.isSafeInteger(e.revision) || e.revision < 1 || e.revision > order.revision || e.newVersion !== e.revision || e.previousVersion !== e.revision - 1 || !Number.isFinite(Date.parse(e.at)) || Date.parse(e.at) < new Date(order.canonical.createdAt).getTime() || Date.parse(e.at) > new Date(order.canonical.updatedAt).getTime());
    if (invalid) return { ...scope, status: 'INVALID_EVIDENCE' as const };
    const unique = new Map(terminal.map(e => [JSON.stringify([e.id, e.commandId, e.revision, Date.parse(e.at)]), e]));
    if (unique.size !== 1) return { ...scope, status: 'CONFLICTING_EVIDENCE' as const };
    const evidence = [...unique.values()][0];
    return { ...scope, status: 'REVIEW_REQUIRED' as const, proposedDeliveredAt: new Date(evidence.at).toISOString(), evidenceId: evidence.id };
  });
}
