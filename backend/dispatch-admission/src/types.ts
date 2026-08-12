export interface BackendDispatchAdmissionHeaders {
  contentType?: string;
  idempotencyKey?: string;
}

export interface BackendDispatchAdmissionCommand {
  method: string;
  endpointPath: string;
  receivedAt: string;
  headers: BackendDispatchAdmissionHeaders;
  body: unknown;
}

export interface BackendDispatchNormalizedItem {
  id: string;
  customerId: string;

  channel: 'whatsapp';
  purpose: 'marketing';

  normalizedPhone: string;
  content: string;

  sourceDraftItemId: string;
  sourceItemFingerprint: string;
}

export interface BackendDispatchNormalizedRequest {
  schemaVersion: 'campaign-dispatch-request.v1';

  requestId: string;
  createdAt: string;

  campaignId: string;

  channel: 'whatsapp';
  purpose: 'marketing';

  sourceDraftId: string;
  sourceBatchFingerprint: string;

  items: BackendDispatchNormalizedItem[];
}

export type BackendDispatchAdmissionIssueCode =
  | 'invalid-method'
  | 'invalid-endpoint-path'
  | 'invalid-content-type'
  | 'missing-idempotency-key'
  | 'invalid-received-at'
  | 'invalid-body'
  | 'invalid-schema-version'
  | 'missing-request-id'
  | 'invalid-created-at'
  | 'missing-campaign-id'
  | 'invalid-channel'
  | 'invalid-purpose'
  | 'missing-source-draft-id'
  | 'missing-source-batch-fingerprint'
  | 'no-items'
  | 'invalid-item'
  | 'missing-item-id'
  | 'duplicate-item-id'
  | 'missing-customer-id'
  | 'missing-normalized-phone'
  | 'invalid-normalized-phone'
  | 'duplicate-normalized-phone'
  | 'empty-content'
  | 'content-too-large'
  | 'missing-source-draft-item-id'
  | 'missing-source-item-fingerprint'
  | 'idempotency-key-mismatch'
  | 'body-size-exceeded';

export interface BackendDispatchAdmissionIssue {
  code: BackendDispatchAdmissionIssueCode;
  message: string;
  path?: string;
  itemId?: string;
}

export interface BackendDispatchAdmissionValidation {
  structurallyValid: boolean;
  issueCount: number;
  issues: BackendDispatchAdmissionIssue[];
}

export interface BackendDispatchIdempotencyProposal {
  status: 'proposal-only-not-persisted';

  suppliedKey: string;
  expectedKey: string;

  matches: boolean;

  uniquenessChecked: false;
  authoritativeEnforcementAvailable: false;
  persisted: false;
}

export interface BackendDispatchQueueItemProposal {
  id: string;

  requestId: string;
  campaignId: string;
  customerId: string;

  channel: 'whatsapp';
  purpose: 'marketing';

  normalizedPhone: string;
  content: string;

  sourceDraftItemId: string;
  sourceItemFingerprint: string;

  status: 'proposed-not-enqueued';
}

export interface BackendDispatchQueueProposal {
  status: 'proposal-only-not-persisted';

  totalItems: number;

  persisted: false;
  enqueued: false;
  workerAvailable: false;
  providerConfigured: false;

  items: BackendDispatchQueueItemProposal[];
}

export interface BackendDispatchAdmissionDecision {
  schemaVersion: 'backend-dispatch-admission.v1';

  status: 'admissible' | 'rejected';
  admissible: boolean;

  evaluatedAt: string;

  validation: BackendDispatchAdmissionValidation;

  normalizedRequest?: BackendDispatchNormalizedRequest;

  idempotency: BackendDispatchIdempotencyProposal;

  queueProposal: BackendDispatchQueueProposal;

  endpointAvailable: false;
  authenticationPerformed: false;
  authorizationPerformed: false;
  persisted: false;
  queueCreated: false;
  providerCalled: false;
  messageSent: false;
}

export const BACKEND_DISPATCH_ENDPOINT_PATH = '/internal/campaign-dispatch-requests';
export const BACKEND_DISPATCH_MAX_BODY_SIZE_BYTES = 262144;
export const BACKEND_DISPATCH_MAX_ITEM_CONTENT_BYTES = 16384;
