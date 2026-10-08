import { evaluateDispatchEligibility } from '../domain/dispatchPrerequisites';
import type { EligibilityEvidence, EligibilityPolicy } from '../domain/dispatchPrerequisites';

/** Preparatory boundaries only. No transport, persistence or send authority. */
export function isPilotOptOut(text: string): boolean {
  if (text.length > 128) return false;
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/[.!?]+$/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
  return ['PARAR', 'SAIR', 'NAO QUERO'].includes(normalized);
}

export function applyPilotOptOut(evidence: EligibilityEvidence, text: string): EligibilityEvidence {
  return isPilotOptOut(text) ? { ...evidence, optedOut: true, consent: 'DENIED' } : { ...evidence };
}

export function preparePilotBatch(input: {
  selectedIds: readonly string[];
  evidence: readonly EligibilityEvidence[];
  policy: EligibilityPolicy;
  requestedCount: number;
  commercialRemaining: number;
  providerRemaining: number | null;
  riskLimit: number;
  operatorStarted: boolean;
}) {
  const limits = [input.requestedCount, input.commercialRemaining, input.providerRemaining, input.riskLimit];
  if (limits.some(n => n !== null && (!Number.isSafeInteger(n) || n < 0))) throw new Error('INVALID_BATCH_LIMIT');
  const cap = input.providerRemaining === null ? 0 : Math.min(...limits as number[]);
  const uniqueIds = [...new Set(input.selectedIds)];
  const decisions = uniqueIds.map(contactId => {
    const matches = input.evidence.filter(e => e.contactId === contactId);
    if (matches.length !== 1) return { contactId, eligible: false, reasons: ['EVIDENCE_MISSING_OR_AMBIGUOUS'] };
    const decision = evaluateDispatchEligibility(matches[0], input.policy);
    const reasons = [...decision.reasons];
    if (matches[0].identity.channel !== 'WHATSAPP') reasons.push('PILOT_WHATSAPP_ONLY');
    if (matches[0].identity.provider !== 'WHATSAPP_META_OFFICIAL') reasons.push('OFFICIAL_META_REQUIRED');
    if (input.evidence.some(e => e.contactId !== contactId && uniqueIds.includes(e.contactId) &&
      e.tenantId === input.policy.tenantId && e.identity.channel === matches[0].identity.channel &&
      e.identity.address === matches[0].identity.address)) reasons.push('DUPLICATE_RECIPIENT');
    return { contactId, eligible: reasons.length === 0, reasons };
  });
  const candidates = decisions.filter(d => d.eligible).map(d => d.contactId);
  return {
    mode: 'SIMULATION' as const,
    canSend: false as const,
    canEnqueue: false as const,
    selectedCount: uniqueIds.length,
    limit: cap,
    previewContactIds: candidates.slice(0, cap),
    preparedContactIds: input.operatorStarted ? candidates.slice(0, cap) : [],
    waitingContactIds: candidates.slice(cap),
    decisions,
    reasons: [...(!input.operatorStarted ? ['OPERATOR_START_REQUIRED'] : []), ...(input.providerRemaining === null ? ['PROVIDER_LIMIT_UNKNOWN'] : [])],
  };
}

export function buildPilotMenuLink(input: {
  approvedOrigin: string | null;
  approvedMenuId: string | null;
  requestedMenuId: string;
}): string {
  if (!input.approvedOrigin || !input.approvedMenuId || input.requestedMenuId !== input.approvedMenuId ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.requestedMenuId)) throw new Error('MENU_BINDING_NOT_APPROVED');
  const origin = new URL(input.approvedOrigin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port || origin.pathname !== '/' ||
    origin.search || origin.hash || origin.hostname === 'localhost' || origin.hostname.endsWith('.localhost') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(origin.hostname) || origin.hostname.includes(':')) throw new Error('MENU_ORIGIN_NOT_APPROVED');
  return `${origin.origin}/cardapio/${input.requestedMenuId}`;
}
