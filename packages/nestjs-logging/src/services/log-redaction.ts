import type { JsonPrimitive, JsonValue } from '../ports/logging-ports';

/**
 * @description Default replacement token written in place of redacted secret/PII values.
 */
export const DEFAULT_REDACTION_REPLACEMENT = '[REDACTED]' as const;

/**
 * @description Default deny-list of (case-insensitive) key-name substrings whose values are
 * always redacted in `extra` (recursively). Matches common credential/PII field names.
 */
export const DEFAULT_REDACTION_KEYS: readonly string[] = [
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'credential',
  'passwd',
  'password',
  'pwd',
  'secret',
  'session',
  'ssn',
  'token',
];

/**
 * @description Default value patterns; any string value (or substring) matching one of these
 * is redacted regardless of its key. Covers bearer/Basic auth, JWTs, and email addresses.
 */
export const DEFAULT_REDACTION_PATTERNS: readonly RegExp[] = [
  // Authorization scheme + credential (Bearer/Basic/Digest/Token …)
  /\b(?:bearer|basic|digest|token)\s+[\w.\-+/=]+/gi,
  // JSON Web Token (three base64url segments)
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  // Email address
  /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
];

/**
 * @description Configurable redaction policy. Pass `false` to the module option to disable
 * redaction entirely (not recommended). When omitted, a default-on policy applies.
 */
export interface RedactionOptions {
  /**
   * @description Case-insensitive key-name substrings whose values are fully replaced in `extra`.
   * Defaults to {@link DEFAULT_REDACTION_KEYS}.
   */
  readonly keys?: ReadonlyArray<string> | undefined;
  /**
   * @description Value patterns redacted anywhere they appear in string values, regardless of key.
   * Defaults to {@link DEFAULT_REDACTION_PATTERNS}.
   */
  readonly patterns?: ReadonlyArray<RegExp> | undefined;
  /**
   * @description When false, skip redacting the top-level `message` (it is redacted by default
   * because callers frequently interpolate secrets into messages). `context` is never redacted
   * (it is a logger category, not user-supplied data). Defaults to true.
   */
  readonly redactMessage?: boolean | undefined;
  /**
   * @description Replacement token for redacted values. Defaults to {@link DEFAULT_REDACTION_REPLACEMENT}.
   */
  readonly replacement?: string | undefined;
}

/**
 * @description Resolved redactor applied at the JSONL serialization chokepoint.
 */
export interface LogRedactor {
  /**
   * @description Whether to redact the top-level `message` field.
   */
  readonly redactMessageEnabled: boolean;
  /**
   * @description Redacts pattern matches inside a single string value (used for `message`).
   */
  readonly redactString: (value: string) => string;
  /**
   * @description Redacts a structured `extra` record: key-name deny-list for object keys (recursing
   * into nested objects/arrays) plus value patterns for any string. Returns a new record; never
   * mutates the input.
   */
  readonly redactValue: (
    value: Readonly<Record<string, JsonValue>>,
  ) => Readonly<Record<string, JsonValue>>;
}

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

  // A single `extra` value: primitive, primitive array, or a nested record of
  // primitives (the shapes permitted by JsonValue). `keyDenied` means an ancestor
  // key matched the deny-list, so every contained primitive is fully replaced.
  const redactJsonValue = (value: JsonValue, keyDenied: boolean): JsonValue => {
    if (Array.isArray(value)) {
      return value.map((entry) => redactPrimitive(entry, keyDenied));
    }

    if (value !== null && typeof value === 'object') {
      const out: Record<string, JsonPrimitive> = {};
      for (const [key, entry] of Object.entries(value)) {
        out[key] = redactPrimitive(
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

/**
 * @description Default-on redactor used when no module `redaction` option is configured. Covers
 * the common credential/PII deny-list and value patterns; redacts `message` by default.
 */
export const DEFAULT_LOG_REDACTOR: LogRedactor = createLogRedactor();
