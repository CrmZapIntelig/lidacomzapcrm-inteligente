export function isBackendJsonSafe(value: unknown): boolean {
  try {
    return checkJsonSafe(value, new Set());
  } catch {
    return false;
  }
}

function checkJsonSafe(value: unknown, seen: Set<unknown>): boolean {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number' && Number.isFinite(value)) return true;

  if (typeof value === 'object') {
    if (seen.has(value)) return false;
    seen.add(value);

    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        seen.delete(value);
        return false;
      }

      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          seen.delete(value);
          return false;
        }

        if (!checkJsonSafe(value[index], seen)) {
          seen.delete(value);
          return false;
        }
      }

      seen.delete(value);
      return true;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      seen.delete(value);
      return false;
    }

    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (!checkJsonSafe((value as Record<string, unknown>)[key], seen)) {
        seen.delete(value);
        return false;
      }
    }

    seen.delete(value);
    return true;
  }
  return false;
}

export function getBackendUtf8Size(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  let size = 0;
  for (let i = 0; i < value.length; i++) {
    const codePoint = value.charCodeAt(i);
    if (codePoint <= 0x7f) {
      size += 1;
    } else if (codePoint <= 0x7ff) {
      size += 2;
    } else if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      // High surrogate: only forms a valid pair when followed by a low surrogate.
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        size += 4;
        i += 1; // skip the low surrogate
      } else {
        // Lone high surrogate: UTF-8 encodes as replacement character (3 bytes).
        size += 3;
      }
    } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      // Lone low surrogate: UTF-8 encodes as replacement character (3 bytes).
      size += 3;
    } else {
      size += 3;
    }
  }
  return size;
}

export function canonicalizeBackendJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort(); // Deterministic default order
    const result = Object.create(null) as Record<string, unknown>;
    for (const key of sortedKeys) {
      result[key] = sortKeys(obj[key]);
    }
    return result;
  }
  return value;
}
