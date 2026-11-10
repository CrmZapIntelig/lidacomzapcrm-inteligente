import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { SatisfactionJobScope } from '../src/application/dailySatisfactionJob';
import type { DeliveredOrderFact, SatisfactionContactPolicy } from '../src/application/dailySatisfactionAudience';
import { policyForClient, satisfactionBusinessDate } from '../src/application/dailySatisfactionPresentation';
import { validateSnapshot, type OperationalSnapshot } from '../src/application/productionOrders';

export async function loadFirestoreSatisfactionFacts(database: Firestore, scope: SatisfactionJobScope) {
  const deliveries: DeliveredOrderFact[] = [];
  const policies: SatisfactionContactPolicy[] = [];
  const contacts = new Set<string>();
  const query = database.collection('unified_orders').where('tenantId', '==', scope.tenantId)
    .select('mode', 'revision', 'payload');
  for await (const row of query.stream() as unknown as AsyncIterable<QueryDocumentSnapshot>) {
    const data = row.data();
    if (data.mode !== 'PRODUCTION' || typeof data.payload !== 'string') throw new Error('SATISFACTION_ORDER_INVALID');
    const order: OperationalSnapshot = JSON.parse(data.payload);
    order.canonical.createdAt = new Date(order.canonical.createdAt);
    order.canonical.updatedAt = new Date(order.canonical.updatedAt);
    validateSnapshot(order, scope.tenantId);
    if (row.id !== order.canonical.id || data.revision !== order.revision) throw new Error('SATISFACTION_ORDER_IDENTITY_INVALID');
    if (order.deliveryState !== 'DELIVERED' || !order.deliveredAt ||
        satisfactionBusinessDate(order.deliveredAt, scope.timeZone) !== scope.businessDate) continue;
    const contactId = order.canonical.contactId;
    deliveries.push({ tenantId: scope.tenantId, orderId: row.id, contactId, state: 'DELIVERED', deliveredAt: order.deliveredAt });
    contacts.add(contactId);
  }
  const ids = [...contacts];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const refs = ids.slice(offset, offset + 100).map(id => database.collection('clients').doc(id));
    const rows = await database.getAll(...refs, { fieldMask: ['tenantId', 'id', 'type', 'channel', 'phone', 'contactPreferences'] });
    for (const row of rows) {
      const client = row.data();
      if (!client) continue;
      if ((client.tenantId !== undefined && client.tenantId !== scope.tenantId) ||
          (client.id !== undefined && client.id !== row.id)) throw new Error('SATISFACTION_CLIENT_IDENTITY_INVALID');
      const prefs = client.contactPreferences;
      if (!['salvo', 'nao_salvo', 'grupo', 'bloqueado'].includes(client.type) || typeof client.phone !== 'string' ||
          (prefs?.globalStatus !== undefined && !['unknown', 'allowed', 'blocked'].includes(prefs.globalStatus)) ||
          (prefs?.preferredChannel !== undefined && !['unknown', 'whatsapp', 'phone', 'rcs', 'none'].includes(prefs.preferredChannel))) continue;
      policies.push(policyForClient(scope.tenantId, {
        id: row.id, phone: client.phone, type: client.type, channel: client.channel, contactPreferences: prefs,
      }, 'WHATSAPP_META_OFFICIAL'));
    }
  }
  return { deliveries, policies };
}
