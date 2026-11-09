/**
 * The replay bin: installed as a backend's `*_BIN`, it stands in for the real
 * CLI. It asserts the argv (and any stdin) it receives matches the transcript
 * strictly — after normalizing this machine's paths the same way the recorder
 * did — then emits the recorded stdout and stderr with timing collapsed and
 * exits as the CLI did.
 *
 * A mismatch exits {@link REPLAY_MISMATCH_EXIT_CODE} with a diff on stderr, and
 * every run writes a {@link ReplayReport} so a test can assert the bin ran and
 * matched even when the backend swallows the exit code.
 *
 * Node built-ins only: this runs under Node's type stripping, outside Vite.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import type { Transcript } from '../../types/transcript.ts';
import { createSanitizer } from '../sanitizer/sanitizer.ts';
import { parseTranscript } from '../transcript/transcript.ts';
import { replayPaths } from './replay-paths.ts';

/**
 * Exit code of a replay whose outbound traffic did not match.
 *
 * @public
 */
export const REPLAY_MISMATCH_EXIT_CODE = 97;

/**
 * How long a replay of a terminated CLI waits for the backend's signal before
 * exiting on its own.
 */
const TERMINATION_WAIT_MS = 10_000;

/** Exit codes a CLI reports when it was terminated by SIGINT or SIGTERM. */
const TERMINATION_EXIT_CODES: ReadonlySet<number> = new Set([130, 143]);

/** @public */
export interface ReplayBinOptions {
  readonly reportPath: string;
  readonly transcriptPath: string;
}

/**
 * What one replay run observed.
 *
 * @public
 */
export type ReplayReport =
  | {
      readonly expected: readonly string[];
      readonly kind: 'argv';
      readonly ok: false;
      readonly received: readonly string[];
    }
  | {
      readonly expected: string;
      readonly kind: 'stdin';
      readonly ok: false;
      readonly received: string;
    }
  | { readonly error: string; readonly kind: 'transcript'; readonly ok: false }
  | { readonly ok: true };

/**
 * Whether the recorded CLI was killed rather than finishing on its own — the
 * backend tore it down, so the replay must wait to be torn down too.
 *
 * @public
 */
export function wasTerminated(transcript: Transcript): boolean {
  return (
    transcript.exit.signal !== null ||
    (transcript.exit.code !== null &&
      TERMINATION_EXIT_CODES.has(transcript.exit.code))
  );
}

/**
 * Compare received outbound traffic against the transcript, returning the
 * first mismatch or `{ ok: true }`.
 *
 * @public
 */
export function compareOutbound(
  transcript: Transcript,
  received: { readonly argv: readonly string[]; readonly stdin: string },
): ReplayReport {
  const argvMatches =
    received.argv.length === transcript.argv.length &&
    received.argv.every((value, index) => value === transcript.argv[index]);
  if (!argvMatches) {
    return {
      expected: transcript.argv,
      kind: 'argv',
      ok: false,
      received: received.argv,
    };
  }

  if (received.stdin !== transcript.stdin) {
    return {
      expected: transcript.stdin,
      kind: 'stdin',
      ok: false,
      received: received.stdin,
    };
  }

  return { ok: true };
}

/** Read stdin only when the transcript expects some; otherwise never block. */
async function readExpectedStdin(expected: string): Promise<string> {
  if (expected === '') {
    return '';
  }
  let received = '';
  for await (const data of process.stdin) {
    received += String(data);
    if (received.length >= expected.length) {
      break;
    }
  }
  return received;
}

function describeMismatch(report: ReplayReport): string {
  if (report.ok) {
    return '';
  }
  if (report.kind === 'transcript') {
    return `[replay] unreadable transcript: ${report.error}\n`;
  }
  return [
    `[replay] outbound ${report.kind} mismatch`,
    `  expected: ${JSON.stringify(report.expected)}`,
    `  received: ${JSON.stringify(report.received)}`,
    '',
  ].join('\n');
}

/**
 * Install SIGINT/SIGTERM handlers and resolve on the first signal. The
 * handlers stay installed (`on`, not `once`): a backend can signal more than
 * once while tearing down, and a second signal with no handler would kill the
 * replay before it reports the recorded exit code.
 *
 * They go on for every replay, not only a terminated one: the transcript
 * already holds how the CLI reacted to any signal it got (agy, for one, traps
 * SIGTERM, writes an `interrupted` result and exits 1), so a signal must never
 * cut the replay short of the recording.
 */
function trapTermination(): Promise<void> {
  return new Promise((resolve) => {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, () => {
        resolve();
      });
    }
  });
}

/** Resolve on the first trapped signal, or after {@link TERMINATION_WAIT_MS}. */
async function waitForTermination(trapped: Promise<void>): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, TERMINATION_WAIT_MS);
  });
  await Promise.race([trapped, timeout]);
  clearTimeout(timer);
}

/**
 * Entry point called by the generated bin.
 *
 * @public
 */
export async function runReplayBin(options: ReplayBinOptions): Promise<void> {
  const report = (value: ReplayReport): void => {
    writeFileSync(options.reportPath, JSON.stringify(value), 'utf8');
  };

  const parsed = parseTranscript(readFileSync(options.transcriptPath, 'utf8'));
  if (!parsed.ok) {
    const failure: ReplayReport = {
      error: parsed.error,
      kind: 'transcript',
      ok: false,
    };
    report(failure);
    process.stderr.write(describeMismatch(failure));
    process.exit(REPLAY_MISMATCH_EXIT_CODE);
  }

  const { transcript } = parsed;
  const sanitizer = createSanitizer({
    paths: replayPaths(process.cwd()),
    redactKeys: [],
  });
  const stdin = await readExpectedStdin(transcript.stdin);
  const result = compareOutbound(transcript, {
    argv: process.argv.slice(2).map(sanitizer.sanitizeText),
    stdin: sanitizer.sanitizeText(stdin),
  });
  report(result);

  if (!result.ok) {
    process.stderr.write(describeMismatch(result));
    process.exit(REPLAY_MISMATCH_EXIT_CODE);
  }

  // Termination handlers go on before any output: a backend can abort on the
  // first chunk it reads, before the last line is written.
  const trapped = trapTermination();
  const terminated = wasTerminated(transcript)
    ? waitForTermination(trapped)
    : null;

  for (const line of transcript.stdout) {
    process.stdout.write(`${line}\n`);
  }
  if (transcript.stderr !== '') {
    process.stderr.write(transcript.stderr);
  }

  if (terminated !== null) {
    await terminated;
  }

  process.exitCode = transcript.exit.code ?? 1;
}
