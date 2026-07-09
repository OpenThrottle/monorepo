import type { ProfileExecutionRedactor } from './profile-execution.redaction';
import type { ProfileExecutionResult } from './profile-execution.types';
import { defaultProfileExecutionRedactor } from './profile-execution.redaction';
import { notifyProfileExecutionReporter } from './profile-execution.reporter';

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

/**
 * @description Runs a function and captures execution metadata (timings, and optionally
 * redacted inputs/output) in a structured format. Use when a decorator is not suitable
 * (e.g. one-off blocks or non-method code).
 *
 * Inputs/output capture is OFF by default — enable via `captureInputs`/`captureOutput` for
 * local/dev tuning only.
 */
export async function profileExecution<T>(
  label: string,
  fn: () => T | Promise<T>,
  options?: ProfileExecutionOptions,
): Promise<ProfileExecutionUtilResult<T>> {
  const startTime = performance.now();
  const captureInputs = options?.captureInputs ?? false;
  const captureOutput = options?.captureOutput ?? false;
  const redactor: ProfileExecutionRedactor =
    options?.redactor ?? defaultProfileExecutionRedactor;
  const metadata = options?.metadata;
  const inputs =
    captureInputs && options?.inputs !== undefined
      ? options.inputs.map((input) => redactor(input))
      : undefined;

  let output: T;

  try {
    const result = fn();
    output = result instanceof Promise ? await result : result;
    const endTime = performance.now();
    const safeOutput = captureOutput ? redactor(output) : undefined;
    const execution: ProfileExecutionResult = {
      durationMs: endTime - startTime,
      endTime,
      label,
      startTime,
      ...(inputs !== undefined && { inputs }),
      ...(metadata !== undefined && { metadata }),
      // When output capture is on, always include the `output` key (even for a
      // nullish/falsy result) so consumers can distinguish "captured a nullish
      // result" from "capture disabled" (key absent).
      ...(captureOutput && { output: safeOutput }),
    };
    notifyProfileExecutionReporter(execution);

    return { execution, result: output };
  } catch (error: unknown) {
    const e = error instanceof Error ? error : new Error(String(error));
    const errorObj = { message: e.message, name: e.name };

    const endTime = performance.now();
    const execution: ProfileExecutionResult = {
      durationMs: endTime - startTime,
      endTime,
      error: errorObj,
      label,
      startTime,
      ...(inputs !== undefined && { inputs }),
      ...(metadata !== undefined && { metadata }),
    };

    notifyProfileExecutionReporter(execution);

    throw error;
  }
}
