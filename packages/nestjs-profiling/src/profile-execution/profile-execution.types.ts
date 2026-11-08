import type { ProfileExecutionResult } from '../decorators/decorators.types.ts';
import type { ProfileExecutionRedactor } from '../profile-execution-redaction/profile-execution-redaction.types.ts';

/**
 * @description Options for {@link profileExecution}.
 *
 * Capturing inputs/output can leak PII and secrets into profiling output, so both are OFF
 * by default. Enable them only for local/dev tuning and never against PII-bearing code in
 * production. When enabled, captured values are redacted (key-name denylist + depth/size caps).
 */
export interface ProfileExecutionOptions {
  /**
   * Capture the supplied `inputs` (redacted). OFF by default; requires `inputs` to be set.
   * @default false
   */
  readonly captureInputs?: boolean;

  /**
   * Capture the function return value as `output` (redacted). OFF by default.
   * @default false
   */
  readonly captureOutput?: boolean;

  /** Inputs to capture when `captureInputs` is enabled. */
  readonly inputs?: readonly unknown[];

  readonly metadata?: Record<string, unknown>;

  /**
   * Redactor applied to captured inputs/output. Defaults to a key-name denylist
   * (password/token/secret/authorization/email/...) with depth and size caps.
   */
  readonly redactor?: ProfileExecutionRedactor;
}

export interface ProfileExecutionUtilResult<T> {
  readonly execution: ProfileExecutionResult;
  readonly result: T;
}
