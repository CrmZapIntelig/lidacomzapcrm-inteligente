import {
  BackendDispatchAdmissionCommand,
  BackendDispatchAdmissionDecision,
  BackendDispatchIdempotencyProposal,
  BackendDispatchNormalizedRequest,
  BackendDispatchQueueItemProposal,
  BackendDispatchQueueProposal,
} from './types';
import {
  BackendDispatchAdmissionValidationResult,
  validateBackendDispatchAdmissionCommand,
} from './validation';

function buildIdempotencyProposal(
  suppliedKey: string,
  expectedKey: string
): BackendDispatchIdempotencyProposal {
  return {
    status: 'proposal-only-not-persisted',
    suppliedKey,
    expectedKey,
    matches: suppliedKey !== '' && suppliedKey === expectedKey,
    uniquenessChecked: false,
    authoritativeEnforcementAvailable: false,
    persisted: false,
  };
}

function buildQueueProposal(
  normalizedRequest: BackendDispatchNormalizedRequest | undefined
): BackendDispatchQueueProposal {
  if (normalizedRequest === undefined) {
    return {
      status: 'proposal-only-not-persisted',
      totalItems: 0,
      persisted: false,
      enqueued: false,
      workerAvailable: false,
      providerConfigured: false,
      items: [],
    };
  }

  const items: BackendDispatchQueueItemProposal[] = normalizedRequest.items.map((item) => ({
    id: `queue:${normalizedRequest.requestId}:${item.id}`,
    requestId: normalizedRequest.requestId,
    campaignId: normalizedRequest.campaignId,
    customerId: item.customerId,
    channel: 'whatsapp',
    purpose: 'marketing',
    normalizedPhone: item.normalizedPhone,
    content: item.content,
    sourceDraftItemId: item.sourceDraftItemId,
    sourceItemFingerprint: item.sourceItemFingerprint,
    status: 'proposed-not-enqueued',
  }));

  return {
    status: 'proposal-only-not-persisted',
    totalItems: items.length,
    persisted: false,
    enqueued: false,
    workerAvailable: false,
    providerConfigured: false,
    items,
  };
}

export function admitBackendDispatchRequest(
  command: BackendDispatchAdmissionCommand
): BackendDispatchAdmissionDecision {
  const result: BackendDispatchAdmissionValidationResult =
    validateBackendDispatchAdmissionCommand(command);

  const hasNoIssues = result.validation.issueCount === 0;
  const normalizedRequest = result.normalizedRequest;

  const decision: BackendDispatchAdmissionDecision = {
    schemaVersion: 'backend-dispatch-admission.v1',
    status: hasNoIssues ? 'admissible' : 'rejected',
    admissible: hasNoIssues,
    evaluatedAt: command.receivedAt,
    validation: result.validation,
    idempotency: buildIdempotencyProposal(
      result.suppliedIdempotencyKey,
      result.expectedIdempotencyKey
    ),
    queueProposal: buildQueueProposal(normalizedRequest),
    endpointAvailable: false,
    authenticationPerformed: false,
    authorizationPerformed: false,
    persisted: false,
    queueCreated: false,
    providerCalled: false,
    messageSent: false,
  };

  // exactOptionalPropertyTypes: omit normalizedRequest when it does not exist.
  if (normalizedRequest !== undefined) {
    decision.normalizedRequest = normalizedRequest;
  }

  return decision;
}