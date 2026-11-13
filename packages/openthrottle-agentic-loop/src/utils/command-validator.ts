import type {
  CommandSequenceResult,
  LoopValidator,
  ScheduleClock,
  SpawnCommand,
  ValidationChunk,
} from '../contract/index.ts';
import {
  COMMAND_TIMEOUT_EXIT_CODE,
  OUTPUT_BUFFER_MAX_CHARS,
} from '../data/data.constants.ts';
import { summarizeCommand } from './command-output.ts';
import { substituteTaskStartSha } from './shell-command.ts';
import { tailForRetry } from './worker-prompt.ts';

export interface RunCommandSequenceOptions {
  readonly clock: ScheduleClock;
  /** Final shell commands (placeholders already substituted). */
  readonly commands: readonly string[];
  readonly cwd: string;
  /**
   * Receives the stream for the command that is running: a `$ <command>` start line, then one
   * summary line when it ends (plus the ANSI-free failure tail on red). Green output is not streamed.
   */
  readonly onOutput: (input: {
    readonly command: string;
    readonly text: string;
  }) => void;
  readonly signal: AbortSignal;
  readonly spawn: SpawnCommand;
  readonly timeoutMs: number;
}

type CommandOutcome =
  | { readonly kind: 'aborted' }
  | { readonly kind: 'green' }
  | { readonly exitCode: number; readonly kind: 'red'; readonly tail: string };

const runCommand = async (
  options: RunCommandSequenceOptions,
  command: string,
): Promise<CommandOutcome> => {
  const emit = (text: string): void => {
    options.onOutput({ command, text });
  };
  const startedAt = options.clock.now();
  let output = '';
  let timedOut = false;

  // The start line is the liveness heartbeat for a command that runs for minutes.
  emit(`$ ${command}\n`);

  const child = options.spawn({
    command,
    cwd: options.cwd,
    onOutput: (text) => {
      output = `${output}${text}`.slice(-OUTPUT_BUFFER_MAX_CHARS);
    },
  });
  const cancelTimeout = options.clock.schedule(() => {
    timedOut = true;
    child.kill();
  }, options.timeoutMs);
  const onAbort = (): void => {
    child.kill();
  };

  options.signal.addEventListener('abort', onAbort, { once: true });

  if (options.signal.aborted) {
    child.kill();
  }

  try {
    const { exitCode } = await child.done;

    if (options.signal.aborted) {
      return { kind: 'aborted' };
    }

    const durationMs = options.clock.now() - startedAt;

    if (timedOut) {
      const tail = tailForRetry(
        `${output}\n[timed out after ${options.timeoutMs} ms and was killed]\n`,
      );

      emit(
        `${summarizeCommand({ command, durationMs, outcome: { kind: 'timed_out' } })}\n${tail}\n`,
      );

      return { exitCode: COMMAND_TIMEOUT_EXIT_CODE, kind: 'red', tail };
    }

    if (exitCode === 0) {
      emit(
        `${summarizeCommand({ command, durationMs, outcome: { kind: 'green' } })}\n`,
      );

      return { kind: 'green' };
    }

    const tail = tailForRetry(output);
    const code = exitCode ?? 1;

    emit(
      `${summarizeCommand({ command, durationMs, outcome: { exitCode: code, kind: 'red' } })}\n${tail}\n`,
    );

    return { exitCode: code, kind: 'red', tail };
  } finally {
    cancelTimeout();
    options.signal.removeEventListener('abort', onAbort);
  }
};

const runFrom = async (
  options: RunCommandSequenceOptions,
  index: number,
): Promise<CommandSequenceResult> => {
  if (options.signal.aborted) {
    return { kind: 'aborted' };
  }

  const command = options.commands[index];

  if (command === undefined) {
    return { kind: 'green' };
  }

  const outcome = await runCommand(options, command);

  if (outcome.kind === 'red') {
    return {
      command,
      exitCode: outcome.exitCode,
      kind: 'red',
      tail: outcome.tail,
    };
  }

  if (outcome.kind === 'aborted') {
    return outcome;
  }

  // Sequencing is the point: the next command starts only after this one exits green.
  return runFrom(options, index + 1);
};

/**
 * @description Runs shell commands strictly one after another; the first non-zero exit (or a
 * timeout) stops the sequence red, and an abort kills the running child and ends `aborted`,
 * never red. Streams a start line and one summary line per command, plus the failure tail on red (§ 10). An empty list is `green`: callers refuse empty
 * validation before getting here.
 * @public
 */
export const runCommandSequence = (
  options: RunCommandSequenceOptions,
): Promise<CommandSequenceResult> => {
  return runFrom(options, 0);
};

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
