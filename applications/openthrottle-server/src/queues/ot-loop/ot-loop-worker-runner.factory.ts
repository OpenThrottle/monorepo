import type {
  WorkerAttemptResult,
  WorkerRunner,
} from '@openthrottle/openthrottle-agentic-loop';
import {
  buildWorkerPrompt,
  clearResultFile,
  createAnsiStripStream,
  createBatchedChunkSink,
  parseWorkerResult,
  readResultFile,
  SINK_MAX_BYTES,
  SINK_MAX_MS,
  splitToolRuns,
  systemScheduleClock,
  tailForRetry,
} from '@openthrottle/openthrottle-agentic-loop';

import type { OtLoopWorkerRunnerOptions } from './ot-loop.types.ts';

const ERROR_SENTINEL = '<promise>ERROR</promise>';

/**
 * @description The OT Loop `WorkerRunner` (§ 3, § 5, § 9, § 10): one `runDriverAsync` invocation per
 * attempt, in the run's worktree, with the routed model, the abort signal and an env that blanks the
 * OT credentials. Driver output streams through a batched sink to plan output tagged with the task.
 * Classification checks `signal.aborted` first (an aborted attempt is a cancel, never a failed
 * attempt), then a usage limit, then the driver's error sentinel or a non-zero exit, and only then
 * reads the result file.
 */
export const createOtLoopWorkerRunner = (
  options: OtLoopWorkerRunnerOptions,
): WorkerRunner => {
  const { cwd, driver, effort, env, output, runDriver, timeoutMs } = options;
  let attempts = 0;

  return {
    run: async (input): Promise<WorkerAttemptResult> => {
      const { model, signal, task } = input;
      let exitCode: number | null | undefined;
      let usageLimited = false;

      attempts += 1;
      // A stale result from an earlier attempt must never be read as this one's.
      await clearResultFile(cwd);

      const sink = createBatchedChunkSink(
        (text) => {
          splitToolRuns(text).forEach((run) => {
            output.write({
              attempt: input.attempt,
              kind: run.kind,
              taskId: task.id,
              text: run.text,
            });
          });
        },
        { maxBytes: SINK_MAX_BYTES, maxMs: SINK_MAX_MS },
        systemScheduleClock,
      );
      // Plain-text CLIs (codex, cursor, …) can emit colour codes; strip them before they are stored.
      const clean = createAnsiStripStream((cleanText) => {
        sink.push(cleanText);
      });
      const flushOutput = (): void => {
        clean.flush();
        sink.flush();
      };
      let text: string;

      try {
        text = await runDriver(
          driver,
          {
            cwd,
            effort,
            env,
            iteration: attempts,
            ...(model !== undefined ? { model } : {}),
            onChunk: (chunk) => {
              clean.push(chunk.data);
            },
            prompt: buildWorkerPrompt({
              guidance: input.guidance,
              previousFailure: input.previousFailure,
              task,
            }),
            signal,
            ...(timeoutMs !== undefined ? { timeoutMs } : {}),
          },
          {
            onExit: (code) => {
              exitCode = code;
            },
            onUsageLimit: (usageLimit) => {
              usageLimited = true;
              options.onUsageLimit(usageLimit);
            },
          },
        );
      } catch (error) {
        flushOutput();
        await output.settled();

        if (signal.aborted) {
          return { kind: 'aborted' };
        }

        const message = error instanceof Error ? error.message : String(error);

        return { kind: 'error', message };
      }

      flushOutput();
      await output.settled();

      if (signal.aborted) {
        return { kind: 'aborted' };
      }

      if (usageLimited) {
        return { kind: 'usage_limited' };
      }

      if (text.includes(ERROR_SENTINEL)) {
        return { kind: 'error', message: tailForRetry(text) };
      }

      if (exitCode !== undefined && exitCode !== 0) {
        return {
          kind: 'error',
          message: `agent CLI exited with code ${exitCode}\n${tailForRetry(text)}`,
        };
      }

      return parseWorkerResult(await readResultFile(cwd));
    },
  };
};
