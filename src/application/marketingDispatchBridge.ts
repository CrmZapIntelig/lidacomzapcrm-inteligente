import type { MarketingCampaign } from '../domain/types';
import type { MarketingAudience } from '../domain/dispatchPrerequisites';
import { captureDispatchAudience } from '../domain/dispatchPrerequisites';
import { businessKey, required, timestamp } from '../domain/offlinePrimitives';
import { createActiveSalesState } from './activeSalesOffline';
import type { ActiveSalesState, DispatchChannelStrategy } from './activeSalesOffline';

export interface MarketingDispatchHandoff {
  idempotencyKey: string;
  marketingCampaignId: string;
  marketingAudienceId: string;
  rationale: string;
  audienceRevision: string;
  dispatch: ActiveSalesState;
}
export interface MarketingDispatchOptions {
  dispatchCampaignId: string;
  dispatchAudienceId: string;
  audienceRevision: string;
  template: string;
  dailyLimit: number;
  strategy: DispatchChannelStrategy;
  minimumIntervalMs: number;
  timeZone: string;
  preparedAt: Date;
}
/** Caller explicitly chooses a marketing audience; no segmentation/storage lookup. */
export function prepareMarketingDispatchHandoff(marketing: MarketingCampaign, audience: MarketingAudience, options: MarketingDispatchOptions): MarketingDispatchHandoff {
  [marketing.id, marketing.tenantId, marketing.name, audience.id, audience.rationale, options.dispatchCampaignId, options.dispatchAudienceId, options.audienceRevision].forEach(required);
  timestamp(marketing.createdAt); timestamp(marketing.updatedAt); timestamp(options.preparedAt);
  if (audience.tenantId !== marketing.tenantId || audience.marketingCampaignId !== marketing.id || options.dispatchCampaignId === marketing.id) throw new Error('MARKETING_DISPATCH_CONTEXT_MISMATCH');
  const snapshot = captureDispatchAudience({ id: options.dispatchAudienceId, tenantId: marketing.tenantId, campaignId: options.dispatchCampaignId, marketingCampaignId: marketing.id, sourceAudienceId: audience.id, revision: options.audienceRevision, contactIds: audience.contactIds, capturedAt: options.preparedAt.toISOString() });
  const dispatch = createActiveSalesState({ campaign: { id: options.dispatchCampaignId, tenantId: marketing.tenantId, name: marketing.name, template: options.template, dailyLimit: options.dailyLimit, createdAt: new Date(options.preparedAt), updatedAt: new Date(options.preparedAt) }, audience: snapshot, strategy: options.strategy, minimumIntervalMs: options.minimumIntervalMs, timeZone: options.timeZone });
  return { idempotencyKey: businessKey(marketing.tenantId, marketing.id, audience.id, options.audienceRevision, options.dispatchCampaignId), marketingCampaignId: marketing.id, marketingAudienceId: audience.id, rationale: audience.rationale, audienceRevision: options.audienceRevision, dispatch };
}
