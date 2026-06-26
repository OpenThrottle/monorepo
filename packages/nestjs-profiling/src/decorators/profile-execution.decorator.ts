import type { ProfileExecutionRedactor } from './profile-execution.redaction';
import type { ProfileExecutionResult } from './profile-execution.types';
import { defaultProfileExecutionRedactor } from './profile-execution.redaction';
import {
  getProfileExecutionReporter,
  notifyProfileExecutionReporter,
} from './profile-execution.reporter';

/**
 * @description Options for {@link ProfileExecution}.
 *
 * Capturing inputs/output can leak PII and secrets (passwords, tokens, emails, full row
 * payloads) into profiling output, so both are OFF by default. Enable them only for
 * local/dev tuning and never against PII-bearing resolvers/services in production.
 */
export interface ProfileExecutionDecoratorOptions {
  /**
   * Capture method arguments as `inputs` (redacted). OFF by default to avoid leaking
   * PII/secrets.
   * @default false
   */
  readonly captureInputs?: boolean;

  /**
   * Capture the return value as `output` (redacted). OFF by default to avoid leaking
   * PII/secrets. When enabled, the result's `output` key is always present (even for a
   * nullish/falsy return), so an absent key unambiguously means capture was disabled.
   * @default false
   */
  readonly captureOutput?: boolean;

  /** Human-readable label for the captured execution. Defaults to the method name. */
  readonly label?: string;

  /**
   * Redactor applied to captured inputs/output. Defaults to a key-name denylist
   * (password/token/secret/authorization/email/...) with depth and size caps.
   */
  readonly redactor?: ProfileExecutionRedactor;
}

function normalizeOptions(
  labelOrOptions?: string | ProfileExecutionDecoratorOptions,
): Required<
  Pick<ProfileExecutionDecoratorOptions, 'captureInputs' | 'captureOutput'>
> & {
  readonly label?: string;
  readonly redactor: ProfileExecutionRedactor;
} {
  if (typeof labelOrOptions === 'string' || labelOrOptions === undefined) {
    return {
      captureInputs: false,
      captureOutput: false,
      label: labelOrOptions,
      redactor: defaultProfileExecutionRedactor,
    };
  }

  return {
    captureInputs: labelOrOptions.captureInputs ?? false,
    captureOutput: labelOrOptions.captureOutput ?? false,
    label: labelOrOptions.label,
    redactor: labelOrOptions.redactor ?? defaultProfileExecutionRedactor,
  };
}

function buildResult(
  label: string,
  methodName: string,
  startTime: number,
  endTime: number,
  inputs: readonly unknown[] | undefined,
  output: unknown,
  captureOutput: boolean,
  error?: { message: string; name: string },
  metadata?: Record<string, unknown>,
): ProfileExecutionResult {
  const durationMs = endTime - startTime;
  const result: ProfileExecutionResult = {
    durationMs,
    endTime,
    label,
    methodName,
    startTime,
    ...(inputs !== undefined && { inputs }),
    ...(error !== undefined && { error }),
    ...(metadata !== undefined && { metadata }),
    // When output capture is on, always include the `output` key (even for an
    // `undefined`/`null`/falsy return) so consumers can distinguish "captured a
    // nullish result" from "capture disabled" (key absent).
    ...(captureOutput && { output }),
  };

  return result;
}

/**
 * @description Captures execution metadata (timings, and optionally redacted inputs/output)
 * in a structured format. Similar to MongoDB .explain() on aggregations. Use
 * {@link setProfileExecutionReporter} to send results to a file or other sink for AI tuning
 * and debugging.
 *
 * Inputs/output capture is OFF by default — enable via `captureInputs`/`captureOutput` for
 * local/dev tuning only. Captured values are redacted (key-name denylist + depth/size caps)
 * but capture must never be enabled against PII-bearing resolvers/services in production.
 *
 * @param labelOrOptions A label string, or an options object with capture flags/redactor.
 */
export function ProfileExecution(
  labelOrOptions?: string | ProfileExecutionDecoratorOptions,
): MethodDecorator {
  const { captureInputs, captureOutput, label, redactor } =
    normalizeOptions(labelOrOptions);

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
        // Zero-config fast path: with no reporter registered there is nothing to
        // build or capture, so skip the redaction/result work entirely. This also
        // avoids pinning captured inputs/output in the closure for no reason.
        const reporter = getProfileExecutionReporter();
        if (reporter === undefined) {
          return;
        }

        const endTime = performance.now();
        const inputs = captureInputs
          ? args.map((arg) => redactor(arg))
          : undefined;
        const safeOutput = captureOutput ? redactor(output) : undefined;
        const execution = buildResult(
          tag,
          methodName,
          startTime,
          endTime,
          inputs,
          safeOutput,
          captureOutput,
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
              // Only retain the resolved value when a reporter is registered and
              // output capture is enabled; otherwise large results are not pinned
              // in the closure for the async method's lifetime.
              if (
                captureOutput &&
                getProfileExecutionReporter() !== undefined
              ) {
                output = value;
              }
              return value;
            })
            .catch((err: unknown) => {
              const e = err instanceof Error ? err : new Error(String(err));
              error = { message: e.message, name: e.name };
              throw err;
            })
            .finally(report) as Promise<unknown>;
        }

        if (captureOutput && getProfileExecutionReporter() !== undefined) {
          output = result;
        }
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
