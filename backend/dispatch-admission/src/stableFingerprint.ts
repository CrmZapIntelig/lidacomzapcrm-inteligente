export function createBackendStableFingerprint(parts: Array<string | null | undefined>): string {
  const normalized = parts.map((p) => (p === undefined || p === null ? '<NULL>' : String(p)));
  const joined = normalized.join('|');

  let hash = 0x811c9dc5 >>> 0;
  for (let i = 0; i < joined.length; i++) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `fp_${hex}`;
}

export function createBackendExpectedIdempotencyKey(
  schemaVersion: string,
  sourceBatchFingerprint: string
): string {
  const fp = createBackendStableFingerprint([schemaVersion, sourceBatchFingerprint]);
  return `idem_fp_${fp.replace(/^fp_/, '')}`;
}
