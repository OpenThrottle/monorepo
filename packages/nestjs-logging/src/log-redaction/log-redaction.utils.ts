import type { JsonPrimitive, JsonValue } from '../ports/ports.types.ts';
import {
  DEFAULT_REDACTION_KEYS,
  DEFAULT_REDACTION_PATTERNS,
  DEFAULT_REDACTION_REPLACEMENT,
} from './log-redaction.constants.ts';
import type { LogRedactor, RedactionOptions } from './log-redaction.types.ts';
const matchesDenyKey = (
  key: string,
  loweredKeys: readonly string[],
): boolean => {
  const lowered = key.toLowerCase();
  return loweredKeys.some((denied) => lowered.includes(denied));
};

/**
 * @description Builds a {@link LogRedactor} from {@link RedactionOptions}. Passing `false`
 * returns a no-op redactor (redaction disabled).
 */
export const createLogRedactor = (
  options?: RedactionOptions | false | undefined,
): LogRedactor => {
  if (options === false) {
    return {
      redactMessageEnabled: false,
      redactString: (value) => value,
      redactValue: (value) => value,
    };
  }

  const replacement = options?.replacement ?? DEFAULT_REDACTION_REPLACEMENT;
  const loweredKeys = (options?.keys ?? DEFAULT_REDACTION_KEYS).map((key) =>
    key.toLowerCase(),
  );
  const patterns = options?.patterns ?? DEFAULT_REDACTION_PATTERNS;
  const redactMessageEnabled = options?.redactMessage ?? true;

  const redactString = (value: string): string => {
    let result = value;
    for (const pattern of patterns) {
      // Reset stateful (global) regexes so reuse across calls is deterministic.
      if (pattern.global) {
        pattern.lastIndex = 0;
      }
      result = result.replace(pattern, replacement);
    }
    return result;
  };

  const redactPrimitive = (
    value: JsonPrimitive,
    keyDenied: boolean,
  ): JsonPrimitive => {
    if (keyDenied) {
      return replacement;
    }
    return typeof value === 'string' ? redactString(value) : value;
  };

  // A single `extra` value: primitive, or an arbitrarily nested array/record of
  // JsonValues (the shapes permitted by JsonValue). Recurses so deny-listed keys at
  // any depth are honored. `keyDenied` means an ancestor key matched the deny-list, so
  // every contained primitive is fully replaced.
  const redactJsonValue = (value: JsonValue, keyDenied: boolean): JsonValue => {
    if (Array.isArray(value)) {
      return value.map((entry) => redactJsonValue(entry, keyDenied));
    }

    if (value !== null && typeof value === 'object') {
      const out: Record<string, JsonValue> = {};
      for (const [key, entry] of Object.entries(value)) {
        out[key] = redactJsonValue(
          entry,
          keyDenied || matchesDenyKey(key, loweredKeys),
        );
      }
      return out;
    }

    return redactPrimitive(value, keyDenied);
  };

  const redactRecord = (
    record: Readonly<Record<string, JsonValue>>,
  ): Readonly<Record<string, JsonValue>> => {
    const out: Record<string, JsonValue> = {};
    for (const [key, entry] of Object.entries(record)) {
      out[key] = redactJsonValue(entry, matchesDenyKey(key, loweredKeys));
    }
    return out;
  };

  return {
    redactMessageEnabled,
    redactString,
    redactValue: redactRecord,
  };
};
