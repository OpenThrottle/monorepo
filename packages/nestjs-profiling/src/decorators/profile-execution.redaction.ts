/**
 * @description Default key-name fragments that mark a value as sensitive. Matching is
 * case-insensitive and substring-based, so `userPassword`, `access_token`, and
 * `Authorization` all match. Used to redact PII/secrets before profiling output is
 * written to disk or any other sink.
 */
export const DEFAULT_REDACTION_DENYLIST: readonly string[] = [
  'apikey',
  'authorization',
  'cookie',
  'credential',
  'email',
  'jwt',
  'password',
  'phone',
  'secret',
  'ssn',
  'token',
];

/** Placeholder substituted for any redacted value. */
export const REDACTED_PLACEHOLDER = '[REDACTED]';

/** Placeholder substituted when the configured max depth is exceeded. */
export const TRUNCATED_DEPTH_PLACEHOLDER = '[TRUNCATED:depth]';

/** Placeholder substituted when a string exceeds the configured max length. */
export const TRUNCATED_SIZE_PLACEHOLDER = '[TRUNCATED:size]';

/**
 * @description Options controlling how profiling inputs/output are redacted before capture.
 */
export interface ProfileExecutionRedactionOptions {
  /**
   * Case-insensitive substring fragments of object keys whose values are replaced
   * with {@link REDACTED_PLACEHOLDER}.
   * @default DEFAULT_REDACTION_DENYLIST
   */
  readonly denylist?: readonly string[];

  /**
   * Maximum object/array nesting depth to traverse. Deeper values are replaced
   * with {@link TRUNCATED_DEPTH_PLACEHOLDER}.
   * @default 8
   */
  readonly maxDepth?: number;

  /**
   * Maximum length of a captured string. Longer strings are truncated and suffixed
   * with {@link TRUNCATED_SIZE_PLACEHOLDER}.
   * @default 4096
   */
  readonly maxStringLength?: number;
}

/** A pluggable redactor that sanitizes an arbitrary value before it is captured. */
export type ProfileExecutionRedactor = (value: unknown) => unknown;

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_STRING_LENGTH = 4096;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proto: unknown = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

function constructorName(value: object): string {
  const ctor: unknown = Reflect.get(value, 'constructor');

  if (
    typeof ctor === 'function' &&
    typeof ctor.name === 'string' &&
    ctor.name.length > 0
  ) {
    return ctor.name;
  }

  return 'object';
}

function keyIsSensitive(key: string, denylist: readonly string[]): boolean {
  const lowerKey = key.toLowerCase();

  return denylist.some((fragment) => lowerKey.includes(fragment));
}

function truncateString(value: string, maxStringLength: number): string {
  if (value.length <= maxStringLength) {
    return value;
  }

  return `${value.slice(0, maxStringLength)}${TRUNCATED_SIZE_PLACEHOLDER}`;
}

/**
 * @description Creates a redactor that deep-clones a value while replacing sensitive
 * keys with {@link REDACTED_PLACEHOLDER}, capping nesting depth and string length.
 * Non-plain objects (class instances, Maps, etc.) are replaced with their type name so
 * raw row payloads are never serialized verbatim. Use as the default sanitizer for
 * profiling inputs/output before they reach a file or other sink.
 */
export function createProfileExecutionRedactor(
  options?: ProfileExecutionRedactionOptions,
): ProfileExecutionRedactor {
  const denylist = (options?.denylist ?? DEFAULT_REDACTION_DENYLIST).map(
    (fragment) => fragment.toLowerCase(),
  );
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxStringLength = options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;

  const redactValue = (value: unknown, depth: number): unknown => {
    if (typeof value === 'string') {
      return truncateString(value, maxStringLength);
    }

    if (
      value === null ||
      value === undefined ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'function' || typeof value === 'symbol') {
      return `[${typeof value}]`;
    }

    if (depth >= maxDepth) {
      return TRUNCATED_DEPTH_PLACEHOLDER;
    }

    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, depth + 1));
    }

    if (isPlainRecord(value)) {
      const result: Record<string, unknown> = {};

      for (const [key, item] of Object.entries(value)) {
        result[key] = keyIsSensitive(key, denylist)
          ? REDACTED_PLACEHOLDER
          : redactValue(item, depth + 1);
      }

      return result;
    }

    // Class instances / Maps / Sets / Dates etc. are not serialized verbatim,
    // both to avoid leaking full row payloads and to keep output deterministic.
    return `[${constructorName(value)}]`;
  };

  return (value: unknown): unknown => redactValue(value, 0);
}

/** Shared default redactor instance used when capture is enabled without a custom redactor. */
export const defaultProfileExecutionRedactor: ProfileExecutionRedactor =
  createProfileExecutionRedactor();

/**
 * @description Redacts a readonly list of inputs, returning a new array. Each element is
 * passed through the supplied redactor.
 */
export function redactInputs(
  inputs: readonly unknown[],
  redactor: ProfileExecutionRedactor,
): readonly unknown[] {
  return inputs.map((input) => redactor(input));
}
