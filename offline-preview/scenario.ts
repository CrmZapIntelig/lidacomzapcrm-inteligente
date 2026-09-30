import type { Contact, Conversation } from '../src/domain/types';
import type { EligibilityEvidence } from '../src/domain/dispatchPrerequisites';
import { createContactChannelIdentity, createProviderCapabilities } from '../src/domain/offlinePrimitives';
import { prepareMarketingDispatchHandoff } from '../src/application/marketingDispatchBridge';
import { prepareActiveSalesDrafts, extendActiveSalesAudience } from '../src/application/activeSalesOffline';
import type { ActiveSalesState, DispatchChannelStrategy } from '../src/application/activeSalesOffline';
import { createOfflineEventState } from '../src/domain/offlineEvents';
import type { OfflineEventState } from '../src/domain/offlineEvents';
import { synchronizeDispatchDraftEvents } from '../src/application/dispatchEventBridge';

export const START = '2026-09-30T12:00:00.000Z';
export const names = ['Ana Exemplo', 'Bruno Exemplo', 'Carla Exemplo', 'Diego Exemplo', 'Elisa Exemplo', 'Fábio Exemplo', 'Gabi Exemplo'];
export interface VisualSession { sales: ActiveSalesState; events: OfflineEventState; at: string; revision: number; feedback: string }
export function scenarioContacts(): Contact[] {
  return names.map((name, i) => ({ id: `demo-contact-${i}`, tenantId: 'demo-offline', name, phone: `+1202555010${i}`, tags: [], notes: 'Dado sintético de demonstração', createdAt: new Date(START), updatedAt: new Date(START) }));
}
export function scenarioEvidence(): EligibilityEvidence[] {
  return scenarioContacts().flatMap((c, i) => (['WHATSAPP', 'RCS'] as const).map(channel => {
    const identity = createContactChannelIdentity({ id: `demo-identity-${i}-${channel}`, tenantId: c.tenantId, contactId: c.id, channel, provider: channel === 'RCS' ? 'RCS_GOOGLE' : 'WHATSAPP_META_OFFICIAL', address: c.phone, availability: channel === 'RCS' && i === 1 ? 'UNKNOWN' : 'KNOWN_AVAILABLE', availabilitySource: 'MANUAL', eligibility: 'ELIGIBLE', eligibilitySource: 'MANUAL', createdAt: new Date(START), updatedAt: new Date(START) });
    return { tenantId: c.tenantId, contactId: c.id, phone: i === 4 ? 'inválido' : c.phone, blocked: i === 2, optedOut: i === 3, group: false, consent: 'ALLOWED', preferredChannel: 'ANY', alreadyPrepared: false, identity, capability: createProviderCapabilities({ channel, provider: identity.provider!, capabilities: ['TEXT'], observedAt: new Date(START), source: 'MANUAL' }), templateApprovedForOffline: true };
  }));
}
export function scenarioConversations(): Conversation[] {
  return scenarioContacts().flatMap(c => (['WHATSAPP', 'RCS'] as const).map(channel => ({ id: `demo-conversation-${c.id}-${channel}`, tenantId: c.tenantId, contactId: c.id, channel, unreadCount: 0, createdAt: new Date(START), updatedAt: new Date(START) })));
}
export function startSession(contactIds: readonly string[], dailyLimit: number, strategy: DispatchChannelStrategy, template: string): VisualSession {
  const at = new Date(START);
  const handoff = prepareMarketingDispatchHandoff({ id: 'demo-marketing', tenantId: 'demo-offline', name: 'Retorno de clientes — exemplo', createdAt: at, updatedAt: at }, { id: 'demo-marketing-audience', tenantId: 'demo-offline', marketingCampaignId: 'demo-marketing', rationale: 'Seleção manual de exemplos para conhecer o fluxo', contactIds }, { dispatchCampaignId: 'demo-dispatch', dispatchAudienceId: 'demo-dispatch-audience', audienceRevision: '1', template, dailyLimit, strategy, minimumIntervalMs: 86400000, timeZone: 'America/Sao_Paulo', preparedAt: at });
  return { sales: handoff.dispatch, events: createOfflineEventState('demo-offline'), at: START, revision: 1, feedback: 'Público preparado. A fila ainda não contém rascunhos.' };
}
export function prepareSession(session: VisualSession): VisualSession {
  const result = prepareActiveSalesDrafts(session.sales, { at: new Date(session.at), contacts: scenarioContacts(), conversations: scenarioConversations(), evidence: scenarioEvidence() });
  const count = result.state.drafts.length - session.sales.drafts.length;
  return { ...session, sales: result.state, events: synchronizeDispatchDraftEvents(result.state, session.events), feedback: count ? `${count} rascunho(s) preparado(s). Nenhuma mensagem enviada.` : 'Nenhum novo rascunho. Confira elegibilidade e orçamento diário.' };
}
export function nextDay(session: VisualSession): VisualSession {
  return { ...session, at: new Date(new Date(session.at).getTime() + 86400000).toISOString(), feedback: 'Dia de simulação avançado. Prepare os próximos rascunhos quando desejar.' };
}
export function appendSyntheticContact(session: VisualSession): VisualSession {
  if (session.sales.audience.contactIds.includes('demo-contact-6')) return { ...session, feedback: 'Gabi Exemplo já está no público; nenhuma entrada duplicada.' };
  const revision = session.revision + 1;
  return { ...session, revision, sales: extendActiveSalesAudience(session.sales, { ...session.sales.audience, revision: String(revision), contactIds: [...session.sales.audience.contactIds, 'demo-contact-6'], capturedAt: session.at }), feedback: 'Gabi Exemplo adicionada ao final da fila. Posições anteriores preservadas.' };
}
