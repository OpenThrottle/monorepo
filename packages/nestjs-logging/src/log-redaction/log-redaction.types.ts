import type { JsonValue } from '../ports/ports.types.ts';

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
