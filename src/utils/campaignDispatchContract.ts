import {
  Campaign,
  CampaignExecutionPreview,
  WhatsAppCampaignReadiness,
  CampaignContactEligibilitySummary,
  PreparedCampaignMessage,
  WhatsAppRecipientReadinessStatus,
  CampaignContactEligibilityStatus,
} from '../types';

// FNV-1a 32-bit implementation returning 8-hex chars
function fnv1a32(input: string): number {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function createStableDispatchFingerprint(parts: Array<string | undefined | null>): string {
  // Treat null/undefined consistently as the literal string '<NULL>' to avoid ambiguity
  const normalized = parts.map((p) => (p === undefined || p === null ? '<NULL>' : String(p)));
  const joined = normalized.join('|');
  const hash = fnv1a32(joined);
  // return short hex with prefix
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `fp_${hex}`;
}

export function createCampaignDispatchDraft(
  campaign: Campaign,
  preparation: CampaignExecutionPreview,
  technicalReadiness: WhatsAppCampaignReadiness,
  contactEligibility: CampaignContactEligibilitySummary,
  draftId: string,
  createdAt: string
) {
  const items = (preparation.preparedMessages || []).map((message: PreparedCampaignMessage, index) => {
    const tech = (technicalReadiness && technicalReadiness.items) || [];
    const elig = (contactEligibility && contactEligibility.recipients) || [];

    const technical = tech.find((t) => t.customerId === message.customerId);
    const eligibility = elig.find((e) => e.customerId === message.customerId);

    const rawPhone = message.phone;
    const normalizedPhone = technical && technical.normalizedPhone ? technical.normalizedPhone : undefined;

    const technicalStatus: WhatsAppRecipientReadinessStatus | undefined = technical ? (technical.readiness as WhatsAppRecipientReadinessStatus) : undefined;
    const eligibilityStatus: CampaignContactEligibilityStatus | undefined = eligibility ? eligibility.status : undefined;

    const content = message.content ?? '';
    const contentTrimmed = content.trim();

    const technicallyReady = technicalStatus === 'phone-ready';
    const eligibleForMarketing = eligibilityStatus === 'eligible';

    const deduplicationFingerprint = createStableDispatchFingerprint([
      campaign.id,
      message.customerId,
      normalizedPhone,
      content,
    ]);

    return {
      id: `${draftId}:item:${index}`,
      campaignId: campaign.id,
      customerId: message.customerId,
      customerName: message.customerName,
      channel: 'whatsapp' as const,
      purpose: 'marketing' as const,
      rawPhone: rawPhone,
      normalizedPhone: normalizedPhone,
      content: content,
      technicalStatus: technicalStatus,
      eligibilityStatus: eligibilityStatus,
      technicallyReady: technicallyReady,
      eligibleForMarketing: eligibleForMarketing,
      status: 'candidate' as const, // initial, will be adjusted
      blockReasons: [] as Array<
        | 'technical-readiness-missing'
        | 'phone-not-ready'
        | 'contact-eligibility-missing'
        | 'contact-not-eligible'
        | 'empty-content'
        | 'duplicate-normalized-phone'
      >,
      deduplicationFingerprint,
    } as const;
  });

  // Apply classification rules in order
  // 1-5: technical/elegibility/content checks
  for (const item of items) {
    // 1. technical readiness missing
    if (item.technicalStatus === undefined) {
      item.status = 'blocked-technical';
      item.blockReasons = ['technical-readiness-missing'];
      continue;
    }

    // 2. technicalStatus != phone-ready
    if (item.technicalStatus !== 'phone-ready') {
      item.status = 'blocked-technical';
      item.blockReasons = ['phone-not-ready'];
      continue;
    }

    // 3. eligibility missing
    if (item.eligibilityStatus === undefined) {
      item.status = 'blocked-eligibility';
      item.blockReasons = ['contact-eligibility-missing'];
      continue;
    }

    // 4. eligibilityStatus != eligible
    if (item.eligibilityStatus !== 'eligible') {
      item.status = 'blocked-eligibility';
      item.blockReasons = ['contact-not-eligible'];
      continue;
    }

    // 5. content empty after trim
    if (!item.content || item.content.trim().length === 0) {
      item.status = 'blocked-content';
      item.blockReasons = ['empty-content'];
      continue;
    }

    // Default to candidate for now
    item.status = 'candidate';
    item.blockReasons = [];
  }

  // 6. detect duplicates by normalizedPhone among items that passed previous checks
  const seenNormalized = new Map<string, string>(); // normalizedPhone -> item id
  for (const item of items) {
    const norm = item.normalizedPhone;
    if (!norm) continue; // don't dedupe if normalizedPhone absent (already blocked technically)

    if (item.status === 'candidate') {
      if (!seenNormalized.has(norm)) {
        seenNormalized.set(norm, item.id);
      } else {
        // mark as duplicate-recipient
        item.status = 'duplicate-recipient';
        item.blockReasons = ['duplicate-normalized-phone'];
      }
    }
  }

  // Build draft summary
  const totalItems = items.length;
  const candidateItems = items.filter((i) => i.status === 'candidate').length;
  const technicalBlockedItems = items.filter((i) => i.status === 'blocked-technical').length;
  const eligibilityBlockedItems = items.filter((i) => i.status === 'blocked-eligibility').length;
  const contentBlockedItems = items.filter((i) => i.status === 'blocked-content').length;
  const duplicateItems = items.filter((i) => i.status === 'duplicate-recipient').length;
  const blockedItems = totalItems - candidateItems;

  // batchFingerprint uses campaign.id, preparation.generatedAt, and fingerprints of items in order
  const itemFingerprints = items.map((i) => i.deduplicationFingerprint);
  const batchFingerprint = createStableDispatchFingerprint([campaign.id, preparation.generatedAt, ...itemFingerprints]);

  const draft = {
    id: draftId,
    campaignId: campaign.id,
    campaignName: campaign.name,
    preparationGeneratedAt: preparation.generatedAt,
    createdAt,
    status: 'draft-only-not-queued' as const,
    backendAvailable: false as const,
    providerConfigured: false as const,
    queuePersisted: false as const,
    idempotencyEnforced: false as const,
    totalItems,
    candidateItems,
    blockedItems,
    technicalBlockedItems,
    eligibilityBlockedItems,
    contentBlockedItems,
    duplicateItems,
    batchFingerprint,
    items,
  };

  return draft;
}

export function getCampaignDispatchDraftWarnings(draft: any): string[] {
  const warnings: string[] = [];
  warnings.push('Este lote é apenas um rascunho local.');
  warnings.push('Nenhum item foi enfileirado ou enviado.');
  warnings.push('A persistência e a idempotência autoritativa dependem de backend seguro.');

  if ((draft && draft.candidateItems) === 0) {
    warnings.push('Não há candidatos aptos para uma futura solicitação backend.');
  }
  if (draft && draft.duplicateItems > 0) {
    warnings.push('Foram detectados telefones normalizados duplicados dentro do lote.');
  }
  if (draft && draft.technicalBlockedItems > 0) {
    warnings.push('Existem destinatários bloqueados por prontidão técnica.');
  }
  if (draft && draft.eligibilityBlockedItems > 0) {
    warnings.push('Existem destinatários bloqueados por elegibilidade de contato.');
  }
  if (draft && draft.contentBlockedItems > 0) {
    warnings.push('Existem itens bloqueados por conteúdo vazio.');
  }

  return warnings;
}
