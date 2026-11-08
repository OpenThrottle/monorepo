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
