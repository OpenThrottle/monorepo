import type {
  CommandSequenceResult,
  ScheduleClock,
  SpawnCommand,
} from '../contract/index.ts';
import {
  COMMAND_TIMEOUT_EXIT_CODE,
  OUTPUT_BUFFER_MAX_CHARS,
  SINK_MAX_BYTES,
  SINK_MAX_MS,
} from '../data/data.constants.ts';
import { createBatchedChunkSink } from './create-batched-chunk-sink.ts';
import { tailForRetry } from './tail-for-retry.ts';

export interface RunCommandSequenceOptions {
  readonly clock: ScheduleClock;
  /** Final shell commands (placeholders already substituted). */
  readonly commands: readonly string[];
  readonly cwd: string;
  /** Receives batched output text for the command that is running. */
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
  const sink = createBatchedChunkSink(
    (text) => {
      options.onOutput({ command, text });
    },
    { maxBytes: SINK_MAX_BYTES, maxMs: SINK_MAX_MS },
    options.clock,
  );
  let output = '';
  let timedOut = false;

  sink.push(`$ ${command}\n`);

  const child = options.spawn({
    command,
    cwd: options.cwd,
    onOutput: (text) => {
      output = `${output}${text}`.slice(-OUTPUT_BUFFER_MAX_CHARS);
      sink.push(text);
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

    if (timedOut) {
      const note = `\n[timed out after ${options.timeoutMs} ms and was killed]\n`;

      sink.push(note);

      return {
        exitCode: COMMAND_TIMEOUT_EXIT_CODE,
        kind: 'red',
        tail: tailForRetry(`${output}${note}`),
      };
    }

    return exitCode === 0
      ? { kind: 'green' }
      : { exitCode: exitCode ?? 1, kind: 'red', tail: tailForRetry(output) };
  } finally {
    cancelTimeout();
    options.signal.removeEventListener('abort', onAbort);
    sink.flush();
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
 * never red. Streams batched output (§ 10). An empty list is `green`: callers refuse empty
 * validation before getting here.
 * @public
 */
export const runCommandSequence = (
  options: RunCommandSequenceOptions,
): Promise<CommandSequenceResult> => {
  return runFrom(options, 0);
};
