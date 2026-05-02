import type { ProfileExecutionResult } from './profile-execution.types';
import { notifyProfileExecutionReporter } from './profile-execution.reporter';

export interface ProfileExecutionOptions {
  readonly inputs?: readonly unknown[];
  readonly metadata?: Record<string, unknown>;
}

export interface ProfileExecutionUtilResult<T> {
  readonly execution: ProfileExecutionResult;
  readonly result: T;
}

/**
 * @description Runs a function and captures execution metadata (inputs, output, timings) in a structured format.
 * Use when a decorator is not suitable (e.g. one-off blocks or non-method code).
 */
export async function profileExecution<T>(
  label: string,
  fn: () => T | Promise<T>,
  options?: ProfileExecutionOptions,
): Promise<ProfileExecutionUtilResult<T>> {
  const startTime = performance.now();
  const inputs = options?.inputs ?? [];
  const metadata = options?.metadata;

  let output: T;
  let error: { message: string; name: string } | undefined;

  try {
    const result = fn();
    output = result instanceof Promise ? await result : (result as T);
    const endTime = performance.now();
    const execution: ProfileExecutionResult = {
      durationMs: endTime - startTime,
      endTime,
      inputs,
      label,
      startTime,
      ...(metadata !== undefined && { metadata }),
      ...(output !== undefined && { output }),
    };
    notifyProfileExecutionReporter(execution);

    return { execution, result: output };
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    error = { message: e.message, name: e.name };

    const endTime = performance.now();
    const execution: ProfileExecutionResult = {
      durationMs: endTime - startTime,
      endTime,
      error,
      inputs,
      label,
      startTime,
      ...(metadata !== undefined && { metadata }),
    };

    notifyProfileExecutionReporter(execution);

    throw err;
  }
}
