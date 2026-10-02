import { scenarioContacts, scenarioEvidence, scenarioConversations, startSession, prepareSession, nextDay } from '../offline-preview/scenario';
import { adaptCrmOrderToDomainOrder, adaptDeliveryOrderToDomainOrder } from '../src/domain/compatAdapters';
import type { Order as LegacyOrder, DeliveryOrder } from '../src/types';
import type { VisualSession } from '../offline-preview/scenario';
import { budgetDay } from '../src/domain/dispatchPrerequisites';

// Manually derived from the canonical state plus verified STG-01 Hosting; no runtime I/O.
export const canonicalSource = 'STG-01 · 02/10/2026';
export const modules = [
  ['dashboard', 'Dashboard', '◈'], ['crm', 'CRM', '▤'], ['clientes', 'Clientes', '◎'], ['conversas', 'Conversas', '◌'],
  ['marketing', 'Marketing', '◇'], ['venda', 'Venda Ativa', '↗'], ['dispatch', 'Disparador Inteligente', '≋'], ['funil', 'Funil', '⋮'],
  ['pedidos', 'Pedidos', '▧'], ['cardapio', 'Cardápio', '▥'], ['caixa', 'Caixa', '▣'], ['cozinha', 'Cozinha / KDS', '◫'],
  ['delivery', 'Delivery', '↝'], ['timeline', 'Timeline', '◷'], ['whatsapp', 'WhatsApp', '◉'], ['rcs', 'RCS', '◍'],
  ['gateway', 'Gateway / Worker', '⇄'], ['config', 'Configurações', '⚙'], ['arquitetura', 'Arquitetura / Status', '⬡'],
] as const;
export type ModuleId = typeof modules[number][0];
export type ProductStatus = 'OPERACIONAL LEGADO' | 'CONTRATO' | 'ADAPTER' | 'OFFLINE IMPLEMENTADO' | 'VISUAL IMPLEMENTADO' | 'STAGING PENDENTE' | 'LIVE PENDENTE';
export interface Capability { id: string; title: string; phase: string; statuses: readonly ProductStatus[]; gap: string; module: ModuleId }
export const capabilities: readonly Capability[] = [
  { id: 'operation', title: 'Operação CRM', phase: 'CRM original', statuses: ['OPERACIONAL LEGADO'], gap: 'Consumidores canônicos ainda não ligados à operação.', module: 'crm' },
  { id: 'sales', title: 'Venda Ativa', phase: 'REC-01 / UNI-05 / UNI-08', statuses: ['OFFLINE IMPLEMENTADO', 'VISUAL IMPLEMENTADO'], gap: 'Execução operacional e persistência transacional pendentes.', module: 'venda' },
  { id: 'marketing', title: 'Marketing', phase: 'UNI-02/03/06', statuses: ['CONTRATO', 'ADAPTER', 'OFFLINE IMPLEMENTADO'], gap: 'Handoff persistido com campanhas operacionais pendente.', module: 'marketing' },
  { id: 'orders', title: 'Pedidos', phase: 'UNI-02/03/04', statuses: ['CONTRATO', 'ADAPTER', 'OFFLINE IMPLEMENTADO'], gap: 'Pedidos unificados operacionalmente ainda incompletos.', module: 'pedidos' },
  { id: 'omni', title: 'Omnichannel', phase: 'UNI-02/03/04 / LIVE-00', statuses: ['CONTRATO', 'ADAPTER', 'OFFLINE IMPLEMENTADO'], gap: 'Inbox real e identidades persistidas pendentes.', module: 'conversas' },
  { id: 'whatsapp', title: 'WhatsApp', phase: 'LIVE-00/01/02/03', statuses: ['OFFLINE IMPLEMENTADO', 'STAGING PENDENTE', 'LIVE PENDENTE'], gap: 'Transporte DISABLED; conta, secrets e canário não comprovados.', module: 'whatsapp' },
  { id: 'rcs', title: 'RCS', phase: 'LIVE-04', statuses: ['OFFLINE IMPLEMENTADO', 'LIVE PENDENTE'], gap: 'Agente não configurado; capability real UNKNOWN.', module: 'rcs' },
  { id: 'gateway', title: 'Gateway / Worker', phase: 'LIVE-00/02', statuses: ['OFFLINE IMPLEMENTADO', 'STAGING PENDENTE'], gap: 'Store distribuído e endpoint público pendentes.', module: 'gateway' },
  { id: 'events', title: 'Timeline / Funil', phase: 'UNI-02/03/04/07', statuses: ['CONTRATO', 'ADAPTER', 'OFFLINE IMPLEMENTADO', 'VISUAL IMPLEMENTADO'], gap: 'Bus genérico e handlers operacionais não integrados.', module: 'timeline' },
  { id: 'staging', title: 'Staging · preview isolado', phase: 'STG-01', statuses: ['VISUAL IMPLEMENTADO'], gap: 'Hosting pr-4 e CI federada comprovados; persistência/worker/integrações ainda pendentes.', module: 'config' },
  { id: 'production', title: 'Produção · novo domínio', phase: 'GATE_OUTBOUND_CANARY_REQUIRED', statuses: ['LIVE PENDENTE'], gap: 'Novo fluxo sem primeiro envio, deploy ou integração real.', module: 'arquitetura' },
  { id: 'identity', title: 'Contact / ChannelIdentity', phase: 'UNI-02/03 / REC-01', statuses: ['CONTRATO', 'ADAPTER', 'OFFLINE IMPLEMENTADO'], gap: 'Client legado preservado; resolução distribuída pendente.', module: 'clientes' },
  { id: 'queue', title: 'Eligibility / Queue / Budget', phase: 'REC-01 / UNI-05', statuses: ['CONTRATO', 'OFFLINE IMPLEMENTADO'], gap: 'Budget de preparo local não é quota do provider.', module: 'dispatch' },
  { id: 'policy', title: 'Janela / TemplatePolicy', phase: 'LIVE-00/01', statuses: ['CONTRATO', 'OFFLINE IMPLEMENTADO'], gap: 'Evidência real e ligação explícita à operação pendentes.', module: 'whatsapp' },
  { id: 'automation', title: 'Automações / respostas', phase: 'LIVE-00/02', statuses: ['OFFLINE IMPLEMENTADO'], gap: 'DRAFT somente; escalonamento humano, sem auto-send.', module: 'gateway' },
];
export const stages = ['RASCUNHO', 'LEAD', 'EM_ATENDIMENTO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'PRODUCAO', 'ENTREGUE', 'FECHADO', 'POS_VENDA'] as const;
export const gatewaySteps = ['Webhook', 'Signature', 'Admission', 'Queue', 'Lease', 'Worker', 'Identity Resolution', 'Conversation Resolution', 'Domain Event'];
export const safety = Object.freeze({ mode: 'OFFLINE PREVIEW', backend: 'NONE', canSend: false, sentMessages: 0, staging: 'PENDENTE', live: 'PENDENTE' });
export const contacts = scenarioContacts().slice(0, 3);
export const identities = scenarioEvidence().filter(e => contacts.some(c => c.id === e.contactId)).map(e => e.identity);
export const conversations = scenarioConversations().filter(c => c.contactId === contacts[0].id);
export function selectModule(current: ModuleId, candidate: string): ModuleId { return modules.some(m => m[0] === candidate) ? candidate as ModuleId : current; }
export function initialSession(): VisualSession { return startSession(['demo-contact-0', 'demo-contact-1', 'demo-contact-2'], 2, 'RCS_FIRST_WITH_WHATSAPP_FALLBACK', 'Olá {{nome}}! Este é um rascunho sintético do LidacomZapCRM.'); }
export { prepareSession, nextDay };
export function sessionBudget(session: VisualSession) {
  const day = budgetDay(new Date(session.at), session.sales.timeZone);
  const used = session.sales.budgets.find(b => b.day === day)?.entryKeys.length ?? 0;
  return { day, used, remaining: Math.max(0, session.sales.campaign.dailyLimit - used) };
}
export const legacyOrder: LegacyOrder = { id: 'demo-order', clientId: 'demo-contact-0', clientName: 'Ana Exemplo', items: [{ id: 'demo-product', productName: 'Prato Demo', price: 20, quantity: 2 }], total: 40, paymentMethod: 'Pix', status: 'Pendente', createdAt: '2026-10-02T12:00:00Z', channel: 'balcao' };
export const legacyDelivery: DeliveryOrder = { id: 'demo-delivery', clientId: 'demo-contact-1', clientName: 'Bruno Exemplo', clientPhone: '+12025550101', items: [{ productId: 'demo-product', productName: 'Prato Demo', selectedSize: 'Demo', selectedSizePrice: 20, selectedAddons: [], removedItems: [], selectedUtensils: [], quantity: 2, subtotal: 40 }], subtotal: 40, deliveryFee: 0, total: 40, paymentMethod: 'Pix', status: 'PEDIDO GERADO', createdAt: '2026-10-02T12:00:00Z', deliveryTime: 'Horário fictício', address: { name: 'Bruno Exemplo', phone: '+12025550101', street: 'Rua Demonstração', number: 'DEMO', neighborhood: 'Bairro Exemplo', zipCode: 'DEMO' }, channel: 'delivery' };
export const canonicalOrder = adaptCrmOrderToDomainOrder(legacyOrder, { tenantId: 'demo-offline', creationMode: 'HUMAN_OPERATOR' });
export const canonicalDelivery = adaptDeliveryOrderToDomainOrder(legacyDelivery, { tenantId: 'demo-offline', creationMode: 'CUSTOMER' });
