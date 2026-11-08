import type { ProfileExecutionResult } from '../decorators/decorators.types.ts';
import { defaultProfileExecutionRedactor } from '../profile-execution-redaction/default-profile-execution-redactor/default-profile-execution-redactor.constants.ts';
import type { ProfileExecutionRedactor } from '../profile-execution-redaction/profile-execution-redaction.types.ts';
import { notifyProfileExecutionReporter } from '../profile-execution-reporter/profile-execution-reporter.utils.ts';
import type {
  ProfileExecutionOptions,
  ProfileExecutionUtilResult,
} from './profile-execution.types.ts';

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
  const rawInputs = captureInputs ? options?.inputs : undefined;
  const inputs = rawInputs?.map((input) => redactor(input));

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
