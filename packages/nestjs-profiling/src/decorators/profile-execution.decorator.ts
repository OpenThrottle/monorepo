import type { ProfileExecutionResult } from './profile-execution.types';
import { notifyProfileExecutionReporter } from './profile-execution.reporter';

function buildResult(
  label: string,
  methodName: string,
  startTime: number,
  endTime: number,
  inputs: readonly unknown[],
  output: unknown,
  error?: { message: string; name: string },
  metadata?: Record<string, unknown>,
): ProfileExecutionResult {
  const durationMs = endTime - startTime;
  const result: ProfileExecutionResult = {
    durationMs,
    endTime,
    inputs,
    label,
    methodName,
    startTime,
    ...(error !== undefined && { error }),
    ...(metadata !== undefined && { metadata }),
    ...(output !== undefined && { output }),
  };
  return result;
}

/**
 * @description Captures execution metadata (inputs, output, timings) in a structured format.
 * Similar to MongoDB .explain() on aggregations. Use {@link setProfileExecutionReporter} to
 * send results to a file or other sink for AI tuning and debugging.
 */
export function ProfileExecution(label?: string): MethodDecorator {
  return (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const tag = label ?? String(propertyKey);
    const methodName = String(propertyKey);

    descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
      const startTime = performance.now();
      let output: unknown;
      let error: { message: string; name: string } | undefined;

      const report = (): void => {
        const endTime = performance.now();
        const execution = buildResult(
          tag,
          methodName,
          startTime,
          endTime,
          args,
          output,
          error,
        );
        notifyProfileExecutionReporter(execution);
      };

      try {
        const result = originalMethod.apply(this, args) as
          | Promise<unknown>
          | unknown;
        if (result instanceof Promise) {
          return result
            .then((value) => {
              output = value;
              return value;
            })
            .catch((err: unknown) => {
              const e = err instanceof Error ? err : new Error(String(err));
              error = { message: e.message, name: e.name };
              throw err;
            })
            .finally(report) as Promise<unknown>;
        }
        output = result;
        report();
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err));
        error = { message: e.message, name: e.name };
        report();
        throw err;
      }
    };

    return descriptor;
  };
}
