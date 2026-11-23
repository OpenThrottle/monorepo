/**
 * @description Runs one job-run lifecycle hook's agent through the shared driver engine
 * (`runDriverAsync`), the same way OT Loop runs its workers, and classifies the outcome into a
 * {@link JobRunHookAgentResult} for `executeJobRunHooksPhase`.
 */

import type {
  AgentAccountError,
  AgentDriver,
  DriverInvocationConfig,
  DriverReasoningEffort,
  RunDriverOptions,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';
import { getDriver, runDriverAsync } from '@openthrottle/openthrottle-drivers';

import type { WorkflowConfigRunner } from '../types/workflow-config.ts';
import { resolveHookPluginDirs } from './hook-plugin-injection.ts';
import type { JobRunHookAgentResult } from './job-run-hooks-runner.ts';
import { withStructuredOutput } from './structured-output/index.ts';

/** @description Runs one agent-CLI invocation; `runDriverAsync` in production. */
export type JobRunHookRunDriver = (
  driver: AgentDriver,
  config: DriverInvocationConfig,
  options: RunDriverOptions,
) => Promise<string>;

export interface RunJobRunHookAgentParams {
  readonly agentPrompt: string;
  readonly backend: WorkflowConfigRunner;
  /** Subprocess cwd; inherits `process.cwd()` when omitted. */
  readonly cwd?: string;
  readonly effort?: DriverReasoningEffort;
  /** Extra env merged over `process.env`. */
  readonly env?: Readonly<Record<string, string>>;
  /** Position of the hook within its phase; log attribution only. */
  readonly hookIndex: number;
  readonly model: string | undefined;
  /** Test seam; defaults to `runDriverAsync`. */
  readonly runDriver?: JobRunHookRunDriver;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}

const ERROR_SENTINEL = '<promise>ERROR</promise>';

const describeUsageLimit = (usageLimit: UsageLimit): string => {
  const resets =
    usageLimit.resetsAt !== null ? `, resets at ${usageLimit.resetsAt}` : '';

  return `agent hit a subscription usage limit${resets}`;
};

const describeAccountError = (accountError: AgentAccountError): string => {
  return `agent account error: ${accountError.kind}`;
};

/**
 * @description Runs one hook agent. Never throws: every outcome is a {@link JobRunHookAgentResult}.
 * Classification order: an aborted signal is a cancel; a rejected spawn is an error; the engine's
 * `<promise>ERROR</promise>` sentinel (timeout) is an error; a usage limit or account error is an
 * error; a non-zero exit code is an error; anything else is ok.
 */
export const runJobRunHookAgent = async (
  params: RunJobRunHookAgentParams,
): Promise<JobRunHookAgentResult> => {
  const runDriver = params.runDriver ?? runDriverAsync;
  const driver = withStructuredOutput(getDriver(params.backend));
  const seen: {
    accountError: AgentAccountError | undefined;
    exitCode: number | null | undefined;
    usageLimit: UsageLimit | undefined;
  } = { accountError: undefined, exitCode: undefined, usageLimit: undefined };
  let output: string;

  try {
    output = await runDriver(
      driver,
      {
        ...(params.cwd !== undefined ? { cwd: params.cwd } : {}),
        ...(params.effort !== undefined ? { effort: params.effort } : {}),
        ...(params.env !== undefined ? { env: params.env } : {}),
        iteration: params.hookIndex,
        ...(params.model !== undefined ? { model: params.model } : {}),
        pluginDirs: resolveHookPluginDirs(
          driver.pluginDirRels === undefined
            ? {}
            : { payloadRels: driver.pluginDirRels },
        ),
        prompt: params.agentPrompt,
        ...(params.signal !== undefined ? { signal: params.signal } : {}),
        timeoutMs: params.timeoutMs,
      },
      {
        onAccountError: (error) => {
          seen.accountError = error;
        },
        onExit: (code) => {
          seen.exitCode = code;
        },
        onUsageLimit: (limit) => {
          seen.usageLimit = limit;
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (params.signal?.aborted === true) {
      return { cancelled: true, errorMessage: message, ok: false };
    }

    return { errorMessage: message, ok: false };
  }

  if (params.signal?.aborted === true) {
    return { cancelled: true, errorMessage: 'Hook agent cancelled', ok: false };
  }

  if (output.startsWith(ERROR_SENTINEL)) {
    const message = output.slice(ERROR_SENTINEL.length).trim();

    return { errorMessage: message, ok: false };
  }

  if (seen.usageLimit !== undefined) {
    return {
      errorMessage: describeUsageLimit(seen.usageLimit),
      ok: false,
      output,
    };
  }

  if (seen.accountError !== undefined) {
    return {
      errorMessage: describeAccountError(seen.accountError),
      ok: false,
      output,
    };
  }

  const { exitCode } = seen;

  if (exitCode !== undefined && exitCode !== null && exitCode !== 0) {
    return {
      errorMessage: `agent CLI exited with code ${exitCode}`,
      ok: false,
      output,
    };
  }

  return { ok: true, output };
};
