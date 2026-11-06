import { withStructuredOutput } from '@openthrottle/openthrottle-agentic-utils';
import type {
  DriverRawOutput,
  DriverRunTermination,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';
import { getDriver, runDriverAsync } from '@openthrottle/openthrottle-drivers';

import type { EvalCase, EvalRunConfig } from '../types/index.ts';

/**
 * @description What the runner hands one agent invocation.
 * @public
 */
export interface EvalIterationInput {
  readonly attempt: number;
  readonly config: EvalRunConfig;
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>> | undefined;
  readonly evalCase: EvalCase;
  readonly timeoutMs: number | undefined;
}

/**
 * @description What one agent invocation produced: the raw stdout the trajectory is built from,
 * the recovered text, and how the process ended.
 * @public
 */
export interface EvalIterationOutput {
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly finalText: string;
  readonly rawStdout: string;
  readonly termination: DriverRunTermination;
  readonly usageLimit: UsageLimit | null;
}

/**
 * @description The injectable agent invocation. Rejects only when the agent could not be launched.
 * @public
 */
export type RunEvalIteration = (
  input: EvalIterationInput,
) => Promise<EvalIterationOutput>;

/**
 * @description The default {@link RunEvalIteration}: the configured driver, switched to its
 * structured stream with `withStructuredOutput`, run with `runDriverAsync`. Raw stdout comes from
 * `onRawOutput` and a subscription limit from `onUsageLimit`.
 * @public
 */
export const runDriverIteration: RunEvalIteration = async (input) => {
  const { attempt, config, cwd, env, evalCase, timeoutMs } = input;
  const driver = withStructuredOutput(getDriver(config.driverId));
  let raw: DriverRawOutput | undefined;
  let usageLimit: UsageLimit | null = null;

  const finalText = await runDriverAsync(
    driver,
    {
      cwd,
      effort: config.effort,
      env,
      iteration: attempt,
      model: config.model,
      prompt: evalCase.input.prompt,
      timeoutMs,
    },
    {
      onRawOutput: (output) => {
        raw = output;
      },
      onUsageLimit: (limit) => {
        usageLimit = limit;
      },
    },
  );

  return {
    durationMs: raw?.durationMs ?? 0,
    exitCode: raw?.exitCode ?? null,
    finalText,
    rawStdout: raw?.stdout ?? '',
    termination: raw?.termination ?? 'exited',
    usageLimit,
  };
};
