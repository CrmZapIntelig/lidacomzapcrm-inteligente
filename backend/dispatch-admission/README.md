# Backend Dispatch Admission Core

This module is an isolated, pure domain boundary representing the first backend-side admission boundary for future campaign dispatch requests.

## Purpose

To independently validate, normalize, and admit incoming campaign dispatch requests, proposing idempotency constraints and local queue items **without relying on infrastructure**.

## Flow

```
unknown backend command
→ independent validation
→ normalization
→ admissible/rejected decision
→ local idempotency proposal
→ local queue item proposals
```

## Input

A `BackendDispatchAdmissionCommand` containing:

- `method` — must be exactly `POST`
- `endpointPath` — must be exactly `/internal/campaign-dispatch-requests`
- `receivedAt` — strict ISO-8601 timestamp (used as `evaluatedAt`)
- `headers.contentType` — media type must be exactly `application/json`
- `headers.idempotencyKey` — supplied idempotency key (optional in input)
- `body` — arbitrary `unknown` value to be validated

## Validation

The command is assessed for contract violations:

- HTTP method and endpoint path
- Content-Type exact media type (`application/json`, case-insensitive, before first `;`)
- Idempotency-Key presence and match against deterministic expected key
- `receivedAt` strict ISO-8601 (calendar-aware, leap years, ±14:00 offset limit)
- Body must be JSON-safe and a plain object
- Schema version, requestId, createdAt (strict ISO), campaignId, channel, purpose, sourceDraftId, sourceBatchFingerprint
- Items must be plain objects with required fields, valid normalized phones, unique IDs, unique phones, non-empty content, content size ≤ 16384 UTF-8 bytes
- Body size ≤ 262144 UTF-8 bytes (computed on backend canonical JSON)

All significant problems are accumulated. Validation does not stop at the first error.

## Normalization

When `issues.length === 0`, a `BackendDispatchNormalizedRequest` is produced containing **only** allowed fields:

- `schemaVersion`, `requestId`, `createdAt`, `campaignId`, `channel` (`whatsapp`), `purpose` (`marketing`), `sourceDraftId`, `sourceBatchFingerprint`, `items`

Each normalized item contains **only**:

- `id`, `customerId`, `channel` (`whatsapp`), `purpose` (`marketing`), `normalizedPhone`, `content` (preserved exactly), `sourceDraftItemId`, `sourceItemFingerprint`

No partial normalization is returned for rejected requests.

## Data Minimization

Extra properties (such as `customerName`, `rawPhone`, `contactPreferences`, technical status, eligibility status, scores, classifications, tags, frontend warnings, frontend validation flags, and unknown extra properties) are explicitly **stripped** during normalization.

## Admission Decision

`admitBackendDispatchRequest(command)` returns:

- `status: 'admissible'` when there are zero issues
- `status: 'rejected'` otherwise
- `evaluatedAt` is exactly `command.receivedAt`
- All infrastructure flags remain `false`: `endpointAvailable`, `authenticationPerformed`, `authorizationPerformed`, `persisted`, `queueCreated`, `providerCalled`, `messageSent`

## Idempotency Proposal

`createBackendExpectedIdempotencyKey(schemaVersion, sourceBatchFingerprint)` performs FNV-1a 32-bit over the pipe-joined normalized parts, strips `fp_`, and returns `idem_fp_<hash>`.

The proposal contains:

- `suppliedKey`, `expectedKey`, `matches`
- `status: 'proposal-only-not-persisted'`
- `uniquenessChecked: false`
- `authoritativeEnforcementAvailable: false`
- `persisted: false`

No lookup is performed. No key is reserved.

## Queue Proposal

When admissible, one queue item proposal is produced for each normalized item, in order.

- Queue item id: `queue:${request.requestId}:${item.id}` — deterministic, never index/timestamp/random/UUID
- Queue item status: `proposed-not-enqueued`
- Queue proposal status: `proposal-only-not-persisted`
- `persisted: false`, `enqueued: false`, `workerAvailable: false`, `providerConfigured: false`

When rejected, the queue proposal has `items: []` and `totalItems: 0`.

## Fingerprint Compatibility

The backend reproduces the frontend FNV-1a 32-bit algorithm independently:

- `null`/`undefined` → literal `<NULL>`
- Separator: `|`
- Iterates JavaScript UTF-16 code units (`charCodeAt`)
- Output: `fp_` + lowercase hex padded to 8 characters

Authoritative vectors are verified in tests.

## Body-Size Semantics

Body size is computed using the **backend canonical JSON** representation (recursively sorted keys, locale-independent) encoded as UTF-8.

- Maximum body size: 262144 bytes
- Maximum item content size: 16384 bytes (UTF-8)
- Unsafe bodies are never canonicalized
- Oversized bodies are not truncated, items are not removed, batches are not split

## Backend Canonical JSON

`canonicalizeBackendJson` recursively sorts object keys using a deterministic, locale-independent ordering, preserves valid own JSON properties (including `__proto__`, `constructor`, and `prototype`), preserves array order, does not mutate input, and produces `JSON.stringify` output without whitespace. It does **not** claim byte-parity with the frontend `localeCompare`.

## JSON Safety

`isBackendJsonSafe` accepts only:

- `null`, `string`, `boolean`, finite numbers
- JSON-safe common, dense arrays (sparse arrays and Array subclasses are rejected)
- JSON-safe plain objects

It safely rejects: `undefined`, functions, symbols, `bigint`, `NaN`, `Infinity`, `-Infinity`, cycles, `Date`, `Map`, `Set`, `RegExp`, class instances, and non-plain objects.

Hostile Proxy/getter input is handled safely and never escapes validation as an uncaught exception.

## UTF-8

`getBackendUtf8Size` prefers `TextEncoder`. The fallback correctly handles surrogate pairs and encodes lone high/low surrogates with replacement-character semantics (3 bytes each).

## Limits

| Constant | Value |
|---|---|
| `BACKEND_DISPATCH_ENDPOINT_PATH` | `/internal/campaign-dispatch-requests` |
| `BACKEND_DISPATCH_MAX_BODY_SIZE_BYTES` | 262144 |
| `BACKEND_DISPATCH_MAX_ITEM_CONTENT_BYTES` | 16384 |
| Phone | `^\+55\d{10,11}$` |

## Current Limitations

This module is a pure, local domain nucleus only.

- This module is **NOT** an HTTP endpoint.
- No backend endpoint is currently available.
- No authentication is performed.
- No authorization is performed.
- No data is persisted.
- No idempotency key is reserved.
- No uniqueness check exists.
- No queue is created.
- No worker exists.
- No provider is configured.
- No message is sent.

`admissible` does **NOT** mean queued.

`admissible` does **NOT** mean persisted.

`admissible` does **NOT** mean sent.

## Tests

Tests use only `node:test` and `node:assert/strict`, importing `../.build/index.js`.

They cover at least 60 named cases including fingerprints, idempotency, strict ISO, JSON safety, canonical JSON, UTF-8, content-type, transport, body, items, content size, body size, data minimization, and admission flags.

## Compile

```sh
npx --no-install tsc -p backend/dispatch-admission/tsconfig.json
```

## Run Tests

```sh
node --test backend/dispatch-admission/tests/admission.test.mjs
```

## Future Architecture

Future backend components may integrate this nucleus into real infrastructure: an HTTP endpoint, authentication, authorization, persistence, authoritative idempotency enforcement, a real queue, a worker, and a provider integration. None of these exist in this version.
