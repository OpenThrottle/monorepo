import type {
  LoopValidator,
  ScheduleClock,
  SpawnCommand,
  ValidationChunk,
} from '../contract/index.ts';
import { runCommandSequence } from './runCommandSequence.ts';
import { substituteTaskStartSha } from './substitute-task-start-sha.ts';

export interface CommandValidatorOptions {
  readonly clock: ScheduleClock;
  /** Resolved validation commands, possibly holding `{taskStartSha}`. */
  readonly commands: readonly string[];
  readonly cwd: string;
  /** Batched output, tagged with the task id so the server can forward it to plan output. */
  readonly onChunk: ((chunk: ValidationChunk) => void) | undefined;
  readonly spawn: SpawnCommand;
  readonly timeoutMs: number;
}

/**
 * @description The real `LoopValidator` (§ 6): runs the commands in `cwd` with a shell, strictly
 * one at a time, `{taskStartSha}` substituted shell-escaped. Red carries the failing command, its
 * exit code and `tailForRetry` output; an abort yields `aborted`, never red.
 * @public
 */
export const createCommandValidator = (
  options: CommandValidatorOptions,
): LoopValidator => {
  return {
    validate: async ({ signal, task, taskStartSha }) => {
      if (options.commands.length === 0) {
        return {
          command: '(none)',
          exitCode: 1,
          kind: 'red',
          tail: `no validation commands configured: validation is never skipped`,
        };
      }

      return runCommandSequence({
        clock: options.clock,
        commands: options.commands.map((command) => {
          return substituteTaskStartSha(command, taskStartSha);
        }),
        cwd: options.cwd,
        onOutput: ({ command, text }) => {
          options.onChunk?.({ command, taskId: task.id, text });
        },
        signal,
        spawn: options.spawn,
        timeoutMs: options.timeoutMs,
      });
    },
  };
};
