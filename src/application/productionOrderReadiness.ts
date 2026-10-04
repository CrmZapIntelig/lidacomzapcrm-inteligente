import type { Order } from '../types';
import { adaptCrmOrderToDomainOrder } from '../domain/compatAdapters';

// Planning only: no execution port, credentials or runtime activation.
export const productionOrderDefault = Object.freeze({ operationalOrderWrites: 'DISABLED', mode: 'DRY_RUN' } as const);
export interface CanaryPlanInput {
  mode: 'DRY_RUN'; appEnv: 'production'; projectId: string;
  operationalOrderWrites: 'DISABLED'; proposedFlag: 'CANARY_TEST_ONLY';
  tenantId: string; actorId: string; canaryId: string; commandId: string;
  revision: 0; at: string;
}
const testId = (v: unknown): v is string => typeof v === 'string' && /^TEST-[A-Za-z0-9-]{1,48}$/.test(v);
export function planProductionOrderCanary(input: CanaryPlanInput) {
  const fields = ['mode', 'appEnv', 'projectId', 'operationalOrderWrites', 'proposedFlag', 'tenantId', 'actorId', 'canaryId', 'commandId', 'revision', 'at'];
  if (Object.keys(input).length !== fields.length || Object.keys(input).some(k => !fields.includes(k)) ||
    input.mode !== 'DRY_RUN' || input.appEnv !== 'production' || input.projectId !== 'project-1300957a-ea82-4645-845' ||
    input.operationalOrderWrites !== 'DISABLED' || input.proposedFlag !== 'CANARY_TEST_ONLY' ||
    input.tenantId !== 'TEST-production-canary' || input.actorId !== 'TEST-authorized-operator' ||
    !testId(input.canaryId) || !testId(input.commandId) || input.revision !== 0 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.at) || !Number.isFinite(Date.parse(input.at)) || new Date(input.at).toISOString() !== input.at) throw new Error('CANARY_READINESS_REJECTED');
  const order: Order = {
    id: input.canaryId, clientId: `TEST-contact-${input.canaryId}`, clientName: 'Cliente TEST Canary Exemplo',
    items: [{ id: `TEST-item-${input.canaryId}`, productName: 'Produto TEST sem producao', price: 0, quantity: 1 }],
    total: 0, paymentMethod: 'Pix', status: 'Pendente', createdAt: input.at, channel: 'balcao',
    notes: `TEST ONLY / CANARY / ${input.commandId} / NAO PRODUZIR / NAO COBRAR`,
  };
  const projection = adaptCrmOrderToDomainOrder(order, { tenantId: input.tenantId, contactId: order.clientId, entryPoint: 'POS', creationMode: 'HUMAN_OPERATOR' });
  if (projection.order.status !== 'CREATED' || projection.order.total !== 0 || projection.items.length !== 1) throw new Error('CANARY_MAPPING_REJECTED');
  return {
    mode: 'DRY_RUN' as const, canWrite: false as const, authorization: 'CANARY NOT AUTHORIZED' as const,
    gate: 'GATE_OPERATIONAL_CANARY_WRITE_REQUIRED', strategy: 'LEGACY_FIRST_CANONICAL_READ_PROJECTION',
    candidate: { collection: 'orders', operation: 'CREATE_IF_ABSENT', order }, projection,
    // These are expected effects of the minimal plan, not proof of live configuration.
    effects: { sale: 0, receipt: 0, cashDelta: 0, nota: false, kds: false, delivery: false, clientWrite: false, messageWrite: false, outbound: false },
    prerequisites: ['HUMAN_SINGLE_ORDER_AUTHORIZATION', 'SERVER_IDENTITY_AND_RULES_VERIFIED', 'TEST_CONTACT_ABSENT', 'EXACT_ORDER_ABSENT', 'WRITERS_QUIESCED', 'AUDIT_AND_ROLLBACK_REHEARSED', 'BACKUP_MANIFEST_VERIFIED'],
    audit: { canaryId: input.canaryId, commandId: input.commandId, orderId: order.id, revision: 0, actor: input.actorId, handler: 'PROPOSED_SERVER_CANARY_CREATE', collection: 'orders', result: 'DRY_RUN_ACCEPTED', rollbackStatus: 'NOT_NEEDED', at: input.at },
  };
}

export function planCanaryRollback(plan: ReturnType<typeof planProductionOrderCanary>, observed: Order | null, financialReferencePresent: boolean) {
  if (financialReferencePresent || observed !== null && JSON.stringify(observed) !== JSON.stringify(plan.candidate.order)) {
    return { canWrite: false as const, action: 'HALT_CONFLICT', preserveAudit: true, restoreOtherDocuments: false };
  }
  return { canWrite: false as const, action: observed === null ? 'ALREADY_ABSENT' : 'PROPOSE_DELETE_EXACT_CANARY_WITH_UPDATE_TIME_PRECONDITION', preserveAudit: true, restoreOtherDocuments: false };
}
