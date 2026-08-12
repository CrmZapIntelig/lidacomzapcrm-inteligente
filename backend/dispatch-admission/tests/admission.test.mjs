import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackendStableFingerprint,
  createBackendExpectedIdempotencyKey,
  canonicalizeBackendJson,
  getBackendUtf8Size,
  isBackendJsonSafe,
  validateBackendDispatchAdmissionCommand,
  admitBackendDispatchRequest,
  BACKEND_DISPATCH_ENDPOINT_PATH,
  BACKEND_DISPATCH_MAX_BODY_SIZE_BYTES,
  BACKEND_DISPATCH_MAX_ITEM_CONTENT_BYTES,
} from '../.build/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_RECEIVED_AT = '2026-08-05T10:00:00.000Z';
const VALID_CREATED_AT = '2026-08-05T09:00:00.000Z';
const VALID_SCHEMA_VERSION = 'campaign-dispatch-request.v1';
const VALID_ITEM_ID = 'requestItem:req-1:item-0';
const VALID_ITEM_ID_2 = 'requestItem:req-1:item-1';
const VALID_PHONE = '+5511999990000';
const VALID_PHONE_2 = '+5521999991111';
const VALID_CONTENT = 'Promoção especial hoje!';
const VALID_SOURCE_DRAFT_ITEM_ID = 'draft-1:item:0';
const VALID_SOURCE_DRAFT_ITEM_ID_2 = 'draft-1:item:1';
const VALID_SOURCE_ITEM_FP = 'fp_12345678';
const VALID_SOURCE_ITEM_FP_2 = 'fp_87654321';
const VALID_SOURCE_BATCH_FP = 'fp_abcdef12';

function makeValidItem(overrides = {}) {
  return {
    id: VALID_ITEM_ID,
    customerId: 'cust-1',
    channel: 'whatsapp',
    purpose: 'marketing',
    normalizedPhone: VALID_PHONE,
    content: VALID_CONTENT,
    sourceDraftItemId: VALID_SOURCE_DRAFT_ITEM_ID,
    sourceItemFingerprint: VALID_SOURCE_ITEM_FP,
    ...overrides,
  };
}

function makeValidBody(overrides = {}) {
  return {
    schemaVersion: VALID_SCHEMA_VERSION,
    requestId: 'req-1',
    createdAt: VALID_CREATED_AT,
    campaignId: 'camp-1',
    channel: 'whatsapp',
    purpose: 'marketing',
    sourceDraftId: 'draft-1',
    sourceBatchFingerprint: VALID_SOURCE_BATCH_FP,
    items: [makeValidItem()],
    ...overrides,
  };
}

function makeValidCommand(overrides = {}) {
  const hasBodyOverride = Object.prototype.hasOwnProperty.call(overrides, 'body');
  const body = hasBodyOverride ? overrides.body : makeValidBody();
  const headers = overrides.headers !== undefined ? overrides.headers : {};
  const command = {
    method: 'POST',
    endpointPath: BACKEND_DISPATCH_ENDPOINT_PATH,
    receivedAt: overrides.receivedAt !== undefined ? overrides.receivedAt : VALID_RECEIVED_AT,
    headers: {
      contentType: 'application/json',
      idempotencyKey: overrides.idempotencyKey !== undefined
        ? overrides.idempotencyKey
        : (headers.idempotencyKey !== undefined ? headers.idempotencyKey : createBackendExpectedIdempotencyKey(VALID_SCHEMA_VERSION, VALID_SOURCE_BATCH_FP)),
      ...headers,
    },
    body,
  };
  if (overrides.method !== undefined) command.method = overrides.method;
  if (overrides.endpointPath !== undefined) command.endpointPath = overrides.endpointPath;
  return command;
}

function makeValidIdempotencyKey() {
  return createBackendExpectedIdempotencyKey(VALID_SCHEMA_VERSION, VALID_SOURCE_BATCH_FP);
}

// ---------------------------------------------------------------------------
// Fixed fingerprint vectors
// ---------------------------------------------------------------------------

test('fingerprint [] -> fp_811c9dc5', () => {
  assert.equal(createBackendStableFingerprint([]), 'fp_811c9dc5');
});

test('fingerprint ["a"] -> fp_e40c292c', () => {
  assert.equal(createBackendStableFingerprint(['a']), 'fp_e40c292c');
});

test('fingerprint ["ab"] -> fp_4d2505ca', () => {
  assert.equal(createBackendStableFingerprint(['ab']), 'fp_4d2505ca');
});

test('fingerprint ["a","b"] -> fp_294c7dd6', () => {
  assert.equal(createBackendStableFingerprint(['a', 'b']), 'fp_294c7dd6');
});

test('fingerprint ["a",null] -> fp_f56f725d', () => {
  assert.equal(createBackendStableFingerprint(['a', null]), 'fp_f56f725d');
});

test('fingerprint [null] -> fp_44328520', () => {
  assert.equal(createBackendStableFingerprint([null]), 'fp_44328520');
});

test('fingerprint ["á"] -> fp_640b5fac', () => {
  assert.equal(createBackendStableFingerprint(['á']), 'fp_640b5fac');
});

test('fingerprint ["😀"] -> fp_cb31c4b8', () => {
  assert.equal(createBackendStableFingerprint(['😀']), 'fp_cb31c4b8');
});

test('fingerprint deterministic for same input', () => {
  const a = createBackendStableFingerprint(['x', 'y', 'z']);
  const b = createBackendStableFingerprint(['x', 'y', 'z']);
  assert.equal(a, b);
});

test('fingerprint null/undefined compatibility', () => {
  assert.equal(
    createBackendStableFingerprint(['a', undefined]),
    createBackendStableFingerprint(['a', null])
  );
});

test('fingerprint Unicode compatibility', () => {
  assert.equal(createBackendStableFingerprint(['á']), 'fp_640b5fac');
  assert.equal(createBackendStableFingerprint(['😀']), 'fp_cb31c4b8');
});

// ---------------------------------------------------------------------------
// Idempotency fixed vectors
// ---------------------------------------------------------------------------

test('idempotency ("","") -> idem_fp_f90c4a3b', () => {
  assert.equal(createBackendExpectedIdempotencyKey('', ''), 'idem_fp_f90c4a3b');
});

test('idempotency ("a","b") -> idem_fp_294c7dd6', () => {
  assert.equal(createBackendExpectedIdempotencyKey('a', 'b'), 'idem_fp_294c7dd6');
});

test('idempotency (schema-v1, fp_12345678) -> idem_fp_a30ef0a4', () => {
  assert.equal(
    createBackendExpectedIdempotencyKey('campaign-dispatch-request.v1', 'fp_12345678'),
    'idem_fp_a30ef0a4'
  );
});

test('batch fingerprint change changes expected idempotency', () => {
  const keyA = createBackendExpectedIdempotencyKey('campaign-dispatch-request.v1', 'fp_11111111');
  const keyB = createBackendExpectedIdempotencyKey('campaign-dispatch-request.v1', 'fp_22222222');
  assert.notEqual(keyA, keyB);
});

// ---------------------------------------------------------------------------
// JSON safety
// ---------------------------------------------------------------------------

test('isBackendJsonSafe accepts null', () => {
  assert.equal(isBackendJsonSafe(null), true);
});

test('isBackendJsonSafe accepts string', () => {
  assert.equal(isBackendJsonSafe('hello'), true);
});

test('isBackendJsonSafe accepts boolean', () => {
  assert.equal(isBackendJsonSafe(true), true);
  assert.equal(isBackendJsonSafe(false), true);
});

test('isBackendJsonSafe accepts finite number', () => {
  assert.equal(isBackendJsonSafe(42), true);
  assert.equal(isBackendJsonSafe(0), true);
  assert.equal(isBackendJsonSafe(-1.5), true);
});

test('isBackendJsonSafe rejects undefined', () => {
  assert.equal(isBackendJsonSafe(undefined), false);
});

test('isBackendJsonSafe rejects function', () => {
  assert.equal(isBackendJsonSafe(() => {}), false);
});

test('isBackendJsonSafe rejects symbol', () => {
  assert.equal(isBackendJsonSafe(Symbol('x')), false);
});

test('isBackendJsonSafe rejects bigint', () => {
  assert.equal(isBackendJsonSafe(10n), false);
});

test('isBackendJsonSafe rejects NaN', () => {
  assert.equal(isBackendJsonSafe(NaN), false);
});

test('isBackendJsonSafe rejects Infinity', () => {
  assert.equal(isBackendJsonSafe(Infinity), false);
  assert.equal(isBackendJsonSafe(-Infinity), false);
});

test('isBackendJsonSafe rejects cyclic object', () => {
  const obj = { a: 1 };
  obj.self = obj;
  assert.equal(isBackendJsonSafe(obj), false);
});

test('isBackendJsonSafe rejects Date', () => {
  assert.equal(isBackendJsonSafe(new Date()), false);
});

test('isBackendJsonSafe rejects Map', () => {
  assert.equal(isBackendJsonSafe(new Map()), false);
});

test('isBackendJsonSafe rejects Set', () => {
  assert.equal(isBackendJsonSafe(new Set()), false);
});

test('isBackendJsonSafe rejects RegExp', () => {
  assert.equal(isBackendJsonSafe(/abc/), false);
});

test('isBackendJsonSafe rejects class instance', () => {
  class Foo {}
  assert.equal(isBackendJsonSafe(new Foo()), false);
});

test('isBackendJsonSafe accepts dense standard arrays', () => {
  assert.equal(isBackendJsonSafe([1, 2, 3]), true);
});

test('isBackendJsonSafe rejects sparse arrays', () => {
  assert.equal(isBackendJsonSafe(new Array(1)), false);
});

test('isBackendJsonSafe rejects partially sparse arrays', () => {
  const input = [];
  input.length = 2;
  input[1] = 'x';
  assert.equal(isBackendJsonSafe(input), false);
});

test('isBackendJsonSafe rejects Array subclasses', () => {
  class CustomArray extends Array {}
  assert.equal(isBackendJsonSafe(new CustomArray()), false);
});

// ---------------------------------------------------------------------------
// Canonical JSON
// ---------------------------------------------------------------------------

test('canonical JSON deterministic', () => {
  const a = canonicalizeBackendJson({ b: 1, a: 2 });
  const b = canonicalizeBackendJson({ a: 2, b: 1 });
  assert.equal(a, b);
});

test('canonical JSON object insertion order irrelevant', () => {
  const x = { a: 1, b: 2 };
  const y = { b: 2, a: 1 };
  assert.equal(canonicalizeBackendJson(x), canonicalizeBackendJson(y));
});

test('canonical JSON array order changes canonical JSON', () => {
  const a = canonicalizeBackendJson([1, 2]);
  const b = canonicalizeBackendJson([2, 1]);
  assert.notEqual(a, b);
});

test('canonicalizer does not mutate input', () => {
  const input = { b: 1, a: { d: 2, c: 3 } };
  const snapshot = JSON.stringify(input);
  canonicalizeBackendJson(input);
  assert.equal(JSON.stringify(input), snapshot);
});

test('canonical JSON preserves own enumerable __proto__ deterministically', () => {
  const input = { b: 1, a: 2 };
  Object.defineProperty(input, '__proto__', {
    value: 'preserved',
    enumerable: true,
    configurable: true,
    writable: true,
  });

  assert.equal(isBackendJsonSafe(input), true);
  const canonical = canonicalizeBackendJson(input);
  assert.equal(canonical, '{"__proto__":"preserved","a":2,"b":1}');
  assert.equal(Object.hasOwn(JSON.parse(canonical), '__proto__'), true);
});

// ---------------------------------------------------------------------------
// UTF-8
// ---------------------------------------------------------------------------

test('UTF-8 ASCII size', () => {
  assert.equal(getBackendUtf8Size('hello'), 5);
});

test('UTF-8 accented size', () => {
  assert.equal(getBackendUtf8Size('á'), 2);
});

test('UTF-8 emoji size', () => {
  assert.equal(getBackendUtf8Size('😀'), 4);
});

test('UTF-8 invalid surrogate fallback', () => {
  // Lone high surrogate encodes as replacement character U+FFFD (3 bytes).
  const loneHigh = '\uD800';
  const loneLow = '\uDC00';
  assert.equal(getBackendUtf8Size(loneHigh), 3);
  assert.equal(getBackendUtf8Size(loneLow), 3);
});

// ---------------------------------------------------------------------------
// Transport validation
// ---------------------------------------------------------------------------

test('valid request admissible', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.status, 'admissible');
  assert.equal(decision.admissible, true);
});

test('normalizedRequest exists when admissible', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.ok(decision.normalizedRequest !== undefined);
  assert.equal(decision.normalizedRequest.schemaVersion, 'campaign-dispatch-request.v1');
  assert.equal(decision.normalizedRequest.requestId, 'req-1');
  assert.equal(decision.normalizedRequest.campaignId, 'camp-1');
  assert.equal(decision.normalizedRequest.channel, 'whatsapp');
  assert.equal(decision.normalizedRequest.purpose, 'marketing');
  assert.equal(decision.normalizedRequest.sourceDraftId, 'draft-1');
  assert.equal(decision.normalizedRequest.sourceBatchFingerprint, VALID_SOURCE_BATCH_FP);
});

test('queue proposal generated when admissible', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.queueProposal.status, 'proposal-only-not-persisted');
  assert.equal(decision.queueProposal.items.length, 1);
});

test('correct queue count', () => {
  const body = makeValidBody({
    items: [makeValidItem(), makeValidItem({
      id: VALID_ITEM_ID_2,
      normalizedPhone: VALID_PHONE_2,
      sourceDraftItemId: VALID_SOURCE_DRAFT_ITEM_ID_2,
      sourceItemFingerprint: VALID_SOURCE_ITEM_FP_2,
    })],
  });
  const decision = admitBackendDispatchRequest(makeValidCommand({ body }));
  assert.equal(decision.queueProposal.totalItems, 2);
  assert.equal(decision.queueProposal.items.length, 2);
});

test('order preserved', () => {
  const body = makeValidBody({
    items: [
      makeValidItem({ id: 'item-aaa', normalizedPhone: '+5511999990001', sourceDraftItemId: 'd-aaa' }),
      makeValidItem({ id: 'item-bbb', normalizedPhone: '+5511999990002', sourceDraftItemId: 'd-bbb' }),
    ],
  });
  const decision = admitBackendDispatchRequest(makeValidCommand({ body }));
  assert.equal(decision.normalizedRequest.items[0].id, 'item-aaa');
  assert.equal(decision.normalizedRequest.items[1].id, 'item-bbb');
  assert.equal(decision.queueProposal.items[0].id, 'queue:req-1:item-aaa');
  assert.equal(decision.queueProposal.items[1].id, 'queue:req-1:item-bbb');
});

test('deterministic queue IDs', () => {
  const body = makeValidBody({
    items: [makeValidItem({ id: 'item-x' })],
  });
  const d1 = admitBackendDispatchRequest(makeValidCommand({ body: JSON.parse(JSON.stringify(body)) }));
  const d2 = admitBackendDispatchRequest(makeValidCommand({ body: JSON.parse(JSON.stringify(body)) }));
  assert.equal(d1.queueProposal.items[0].id, d2.queueProposal.items[0].id);
  assert.equal(d1.queueProposal.items[0].id, 'queue:req-1:item-x');
});

test('all infrastructure flags false when admissible', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.endpointAvailable, false);
  assert.equal(decision.authenticationPerformed, false);
  assert.equal(decision.authorizationPerformed, false);
  assert.equal(decision.persisted, false);
  assert.equal(decision.queueCreated, false);
  assert.equal(decision.providerCalled, false);
  assert.equal(decision.messageSent, false);
});

test('invalid request rejected', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand({
    method: 'GET',
  }));
  assert.equal(decision.status, 'rejected');
  assert.equal(decision.admissible, false);
});

test('rejected has NO normalizedRequest property', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand({ method: 'GET' }));
  assert.equal('normalizedRequest' in decision, false);
});

test('rejected empty queue', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand({ method: 'GET' }));
  assert.equal(decision.queueProposal.items.length, 0);
  assert.equal(decision.queueProposal.totalItems, 0);
});

test('invalid method', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({ method: 'PUT' }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-method'));
});

test('invalid endpoint', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    endpointPath: '/elsewhere',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-endpoint-path'));
});

test('invalid content type', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { contentType: 'text/plain' },
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-content-type'));
});

test('application/json accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand());
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-content-type'), false);
});

test('application/json charset accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { contentType: 'application/json; charset=utf-8' },
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-content-type'), false);
});

test('case-insensitive media type accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { contentType: 'Application/JSON ; charset=UTF-8' },
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-content-type'), false);
});

test('application/jsonp rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { contentType: 'application/jsonp' },
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-content-type'));
});

test('missing idempotency key', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { idempotencyKey: undefined },
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-idempotency-key'));
});

test('missing key does not also mismatch', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { idempotencyKey: undefined },
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'idempotency-key-mismatch'), false);
});

test('wrong idempotency key', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    headers: { idempotencyKey: 'idem_fp_00000000' },
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'idempotency-key-mismatch'));
});

test('correct idempotency key', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand());
  assert.equal(result.validation.issues.some(i => i.code === 'idempotency-key-mismatch'), false);
  assert.equal(result.validation.issues.some(i => i.code === 'missing-idempotency-key'), false);
});

// ---------------------------------------------------------------------------
// Strict ISO validation
// ---------------------------------------------------------------------------

test('invalid receivedAt human date rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: 'August 5, 2026',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt date-only rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt impossible February date rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-02-30T10:00:00Z',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt non-leap Feb 29 rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2025-02-29T10:00:00Z',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt month 13 rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-13-01T10:00:00Z',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt hour 25 rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T25:00:00Z',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt minute 60 rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:60:00Z',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('valid leap date accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2028-02-29T10:00:00Z',
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-received-at'), false);
});

test('valid timezone ISO with fraction accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T20:00:00.000Z',
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-received-at'), false);
});

test('valid numeric offset accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00-03:00',
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-received-at'), false);
});

test('+14:00 offset accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00+14:00',
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-received-at'), false);
});

test('-14:00 offset accepted', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00-14:00',
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-received-at'), false);
});

test('+14:01 offset rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00+14:01',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('+15:00 offset rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00+15:00',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('fractional dot escaped rejects x123Z', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00x123Z',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('invalid receivedAt slash-separated rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    receivedAt: '08/05/2026',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-received-at'));
});

test('createdAt impossible February date rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ createdAt: '2026-02-30T10:00:00Z' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-created-at'));
});

test('createdAt impossible month rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ createdAt: '2026-13-01T10:00:00Z' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-created-at'));
});

test('createdAt non-leap Feb 29 rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ createdAt: '2025-02-29T10:00:00Z' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-created-at'));
});

test('createdAt invalid timezone rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ createdAt: '2026-08-05T10:00:00+15:00' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-created-at'));
});

test('admissible uses command.receivedAt as evaluatedAt', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand({
    receivedAt: '2026-08-05T10:00:00.000Z',
  }));
  assert.equal(decision.evaluatedAt, '2026-08-05T10:00:00.000Z');
});

// ---------------------------------------------------------------------------
// Body validation
// ---------------------------------------------------------------------------

test('body non-object rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: 'not-an-object',
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('body array rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: [1, 2, 3],
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('undefined rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: undefined,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('function rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: () => {},
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('symbol rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: Symbol('x'),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('bigint rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: 10n,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('NaN rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: NaN,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('Infinity rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: Infinity,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('cycle rejected safely', () => {
  const cyclic = { a: 1 };
  cyclic.self = cyclic;
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: cyclic,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('Date rejected safely', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: new Date(),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('class instance rejected safely', () => {
  class Foo {}
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: new Foo(),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('hostile Proxy getter does not throw', () => {
  const hostile = new Proxy({}, {
    get() {
      throw new Error('hostile getter');
    },
  });
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: hostile,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('hostile Proxy getPrototypeOf does not throw', () => {
  const hostile = new Proxy({}, {
    getPrototypeOf() {
      throw new Error('hostile prototype');
    },
  });
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: hostile,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('hostile Proxy ownKeys does not throw', () => {
  const hostile = new Proxy({}, {
    ownKeys() {
      throw new Error('hostile ownKeys');
    },
  });
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: hostile,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('idempotency fallback uses readable fields even when canonicalization fails', () => {
  const body = {
    schemaVersion: VALID_SCHEMA_VERSION,
    sourceBatchFingerprint: VALID_SOURCE_BATCH_FP,
  };
  // Schema and fingerprint are readable; then a hostile Proxy trap fails later.
  const hostile = new Proxy(body, {
    ownKeys() {
      throw new Error('hostile ownKeys');
    },
  });
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: hostile,
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
  // Expected key uses readable schema/fingerprint, not ('', '').
  const expectedReadable = createBackendExpectedIdempotencyKey(VALID_SCHEMA_VERSION, VALID_SOURCE_BATCH_FP);
  assert.equal(result.expectedIdempotencyKey, expectedReadable);
});

// ---------------------------------------------------------------------------
// Root fields
// ---------------------------------------------------------------------------

test('invalid schema', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ schemaVersion: 'wrong.v1' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-schema-version'));
});

test('missing requestId', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ requestId: '' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-request-id'));
});

test('invalid createdAt', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ createdAt: 'not-a-date' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-created-at'));
});

test('missing campaignId', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ campaignId: '' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-campaign-id'));
});

test('invalid channel', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ channel: 'sms' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-channel'));
});

test('invalid purpose', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ purpose: 'transactional' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-purpose'));
});

test('missing sourceDraftId', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ sourceDraftId: '' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-source-draft-id'));
});

test('missing sourceBatchFingerprint', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ sourceBatchFingerprint: '' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-source-batch-fingerprint'));
});

test('missing items', () => {
  const body = makeValidBody();
  delete body.items;
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({ body }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('empty items', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'no-items'));
});

test('items non-array rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: 'not-an-array' }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

// ---------------------------------------------------------------------------
// Items validation
// ---------------------------------------------------------------------------

test('item non-object rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: ['not-an-object'] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-item'));
});

test('class instance item rejected', () => {
  class Foo {}
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [new Foo()] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
  assert.equal(result.validation.issues.some(i => i.code === 'invalid-item'), false);
});

test('sparse items array rejected before item validation', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand({
    body: makeValidBody({ items: new Array(1) }),
  }));
  assert.equal(decision.status, 'rejected');
  assert.equal(decision.admissible, false);
  assert.ok(decision.validation.issues.some(i => i.code === 'invalid-body'));
  assert.equal('normalizedRequest' in decision, false);
  assert.equal(decision.queueProposal.totalItems, 0);
  assert.deepEqual(decision.queueProposal.items, []);
});

test('Array subclass items rejected before item validation', () => {
  class CustomArray extends Array {}
  const items = new CustomArray();
  items.push(makeValidItem());

  const decision = admitBackendDispatchRequest(makeValidCommand({
    body: makeValidBody({ items }),
  }));
  assert.equal(decision.status, 'rejected');
  assert.equal(decision.admissible, false);
  assert.ok(decision.validation.issues.some(i => i.code === 'invalid-body'));
});

test('normal dense item array remains admissible', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem()] }),
  }));
  assert.equal(decision.status, 'admissible');
  assert.equal(decision.queueProposal.totalItems, 1);
});

test('missing item id', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ id: '' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-item-id'));
});

test('duplicate item id', () => {
  const body = makeValidBody({
    items: [makeValidItem(), makeValidItem({
      normalizedPhone: VALID_PHONE_2,
      sourceDraftItemId: VALID_SOURCE_DRAFT_ITEM_ID_2,
      sourceItemFingerprint: VALID_SOURCE_ITEM_FP_2,
    })],
  });
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({ body }));
  assert.ok(result.validation.issues.some(i => i.code === 'duplicate-item-id'));
});

test('missing customerId', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ customerId: '' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-customer-id'));
});

test('missing phone', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ normalizedPhone: '' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-normalized-phone'));
});

test('invalid normalized phone', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ normalizedPhone: '11999990000' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-normalized-phone'));
});

test('raw phone rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ normalizedPhone: '(+55) 11 99999-0000' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-normalized-phone'));
});

test('short phone rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ normalizedPhone: '+5511999' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-normalized-phone'));
});

test('long phone rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ normalizedPhone: '+551199999000099' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-normalized-phone'));
});

test('duplicate phone', () => {
  const body = makeValidBody({
    items: [makeValidItem(), makeValidItem({
      id: VALID_ITEM_ID_2,
      sourceDraftItemId: VALID_SOURCE_DRAFT_ITEM_ID_2,
      sourceItemFingerprint: VALID_SOURCE_ITEM_FP_2,
    })],
  });
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({ body }));
  assert.ok(result.validation.issues.some(i => i.code === 'duplicate-normalized-phone'));
});

test('missing sourceDraftItemId', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ sourceDraftItemId: '' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-source-draft-item-id'));
});

test('missing sourceItemFingerprint', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ sourceItemFingerprint: '' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'missing-source-item-fingerprint'));
});

test('invalid channel in item', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ channel: 'sms' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-item'));
});

test('invalid purpose in item', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ purpose: 'transactional' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-item'));
});

test('content non-string rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ content: 123 })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'empty-content'));
});

test('empty content rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ content: '' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'empty-content'));
});

test('whitespace content rejected', () => {
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ content: '   ' })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'empty-content'));
});

// ---------------------------------------------------------------------------
// Content size
// ---------------------------------------------------------------------------

test('content exactly 16384 bytes accepted', () => {
  const content = 'a'.repeat(16384);
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ content })] }),
  }));
  assert.equal(result.validation.issues.some(i => i.code === 'content-too-large'), false);
});

test('content over 16384 bytes rejected', () => {
  const content = 'a'.repeat(16385);
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ content })] }),
  }));
  assert.ok(result.validation.issues.some(i => i.code === 'content-too-large'));
});

test('content preserved exactly with surrounding spaces', () => {
  const content = '  conteúdo com espaços  ';
  const decision = admitBackendDispatchRequest(makeValidCommand({
    body: makeValidBody({ items: [makeValidItem({ content })] }),
  }));
  assert.equal(decision.normalizedRequest.items[0].content, content);
});

// ---------------------------------------------------------------------------
// Body size
// ---------------------------------------------------------------------------

test('body size exactly 262144 bytes accepted (non-object still invalid-body)', () => {
  // 'a'.repeat(262142) + 2 quotes = 262144 bytes canonical.
  const body = 'a'.repeat(262142);
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({ body }));
  assert.equal(result.validation.issues.some(i => i.code === 'body-size-exceeded'), false);
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('body size over 262144 bytes rejected', () => {
  const body = 'a'.repeat(262143);
  const result = validateBackendDispatchAdmissionCommand(makeValidCommand({ body }));
  assert.ok(result.validation.issues.some(i => i.code === 'body-size-exceeded'));
  assert.ok(result.validation.issues.some(i => i.code === 'invalid-body'));
});

test('own __proto__ contributes to body size and rejects oversized valid body', () => {
  const body = makeValidBody();
  Object.defineProperty(body, '__proto__', {
    value: 'x'.repeat(BACKEND_DISPATCH_MAX_BODY_SIZE_BYTES),
    enumerable: true,
    configurable: true,
    writable: true,
  });

  const decision = admitBackendDispatchRequest(makeValidCommand({ body }));
  assert.ok(decision.validation.issues.some(i => i.code === 'body-size-exceeded'));
  assert.equal(decision.admissible, false);
  assert.equal('normalizedRequest' in decision, false);
  assert.equal(decision.queueProposal.totalItems, 0);
  assert.deepEqual(decision.queueProposal.items, []);
});

// ---------------------------------------------------------------------------
// Normalization / data minimization
// ---------------------------------------------------------------------------

test('extra root fields stripped', () => {
  const body = makeValidBody({
    customerName: 'João',
    rawPhone: '11999990000',
    contactPreferences: { sms: true },
    extraRoot: 'x',
  });
  const decision = admitBackendDispatchRequest(makeValidCommand({ body }));
  assert.equal('customerName' in decision.normalizedRequest, false);
  assert.equal('rawPhone' in decision.normalizedRequest, false);
  assert.equal('contactPreferences' in decision.normalizedRequest, false);
  assert.equal('extraRoot' in decision.normalizedRequest, false);
});

test('extra item fields stripped', () => {
  const body = makeValidBody({
    items: [makeValidItem({
      customerName: 'Maria',
      rawPhone: '11999990000',
      contactPreferences: { email: true },
      extraItem: 'y',
    })],
  });
  const decision = admitBackendDispatchRequest(makeValidCommand({ body }));
  const item = decision.normalizedRequest.items[0];
  assert.equal('customerName' in item, false);
  assert.equal('rawPhone' in item, false);
  assert.equal('contactPreferences' in item, false);
  assert.equal('extraItem' in item, false);
});

test('normalizedRequest has only allowed fields', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  const req = decision.normalizedRequest;
  const allowed = ['schemaVersion', 'requestId', 'createdAt', 'campaignId', 'channel', 'purpose', 'sourceDraftId', 'sourceBatchFingerprint', 'items'];
  for (const key of Object.keys(req)) {
    assert.ok(allowed.includes(key), `unexpected key: ${key}`);
  }
});

test('normalized item has only allowed fields', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  const item = decision.normalizedRequest.items[0];
  const allowed = ['id', 'customerId', 'channel', 'purpose', 'normalizedPhone', 'content', 'sourceDraftItemId', 'sourceItemFingerprint'];
  for (const key of Object.keys(item)) {
    assert.ok(allowed.includes(key), `unexpected key: ${key}`);
  }
});

test('array order preserved in normalization', () => {
  const body = makeValidBody({
    items: [
      makeValidItem({ id: 'z', normalizedPhone: '+5511999990001', sourceDraftItemId: 'z' }),
      makeValidItem({ id: 'a', normalizedPhone: '+5511999990002', sourceDraftItemId: 'a' }),
      makeValidItem({ id: 'm', normalizedPhone: '+5511999990003', sourceDraftItemId: 'm' }),
    ],
  });
  const decision = admitBackendDispatchRequest(makeValidCommand({ body }));
  assert.deepEqual(decision.normalizedRequest.items.map(i => i.id), ['z', 'a', 'm']);
});

// ---------------------------------------------------------------------------
// Admission progress flags
// ---------------------------------------------------------------------------

test('idempotency proposal flags false', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.idempotency.status, 'proposal-only-not-persisted');
  assert.equal(decision.idempotency.uniquenessChecked, false);
  assert.equal(decision.idempotency.authoritativeEnforcementAvailable, false);
  assert.equal(decision.idempotency.persisted, false);
});

test('queue proposal flags false', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.queueProposal.status, 'proposal-only-not-persisted');
  assert.equal(decision.queueProposal.persisted, false);
  assert.equal(decision.queueProposal.enqueued, false);
  assert.equal(decision.queueProposal.workerAvailable, false);
  assert.equal(decision.queueProposal.providerConfigured, false);
});

test('queue item status proposed-not-enqueued', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.queueProposal.items[0].status, 'proposed-not-enqueued');
});

test('decision schemaVersion', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.schemaVersion, 'backend-dispatch-admission.v1');
});

test('no persistence no queue no provider no send', () => {
  const decision = admitBackendDispatchRequest(makeValidCommand());
  assert.equal(decision.persisted, false);
  assert.equal(decision.queueCreated, false);
  assert.equal(decision.providerCalled, false);
  assert.equal(decision.messageSent, false);
});
