/**
 * The recording shim: installed as a backend's `*_BIN`, it runs the real CLI
 * with exactly the argv, env and stdio the production backend chose, passes
 * every byte through untouched, and appends what it saw to a capture file as
 * transcript lines (argv, stdin, stdout lines, stderr, exit) — everything but
 * the header, which the recorder adds.
 *
 * Lines are appended as they happen, so a backend that escalates to SIGKILL
 * still leaves a usable capture; only the exit line is lost.
 *
 * Node built-ins only: this runs under Node's type stripping, outside Vite.
 */

import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';

import {
  TRANSCRIPT_CHANNELS,
  TRANSCRIPT_LINE_TYPES,
  type TranscriptLine,
} from '../../types/transcript.ts';

/** @public */
export interface RecordingShimOptions {
  /** Where to append the captured transcript lines. Truncated on start. */
  readonly capturePath: string;
  /** Absolute path of the real CLI binary. */
  readonly realBin: string;
}

const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/**
 * Entry point called by the generated bin.
 *
 * @public
 */
export async function runRecordingShim(
  options: RecordingShimOptions,
): Promise<void> {
  const append = (line: TranscriptLine): void => {
    appendFileSync(options.capturePath, `${JSON.stringify(line)}\n`, 'utf8');
  };

  const argv = process.argv.slice(2);
  writeFileSync(options.capturePath, '', 'utf8');
  append({
    argv,
    channel: TRANSCRIPT_CHANNELS.argv,
    type: TRANSCRIPT_LINE_TYPES.outbound,
  });

  const child = spawn(options.realBin, argv, {
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  for (const signal of FORWARDED_SIGNALS) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  process.stdin.on('data', (data: Buffer) => {
    append({
      channel: TRANSCRIPT_CHANNELS.stdin,
      data: data.toString('utf8'),
      type: TRANSCRIPT_LINE_TYPES.outbound,
    });
    child.stdin.write(data);
  });
  process.stdin.on('end', () => {
    child.stdin.end();
  });

  let pending = '';
  child.stdout.on('data', (data: Buffer) => {
    process.stdout.write(data);
    const parts = `${pending}${data.toString('utf8')}`.split('\n');
    pending = parts.pop() ?? '';
    for (const part of parts) {
      append({
        channel: TRANSCRIPT_CHANNELS.stdout,
        data: part,
        type: TRANSCRIPT_LINE_TYPES.inbound,
      });
    }
  });

  child.stderr.on('data', (data: Buffer) => {
    process.stderr.write(data);
    append({
      channel: TRANSCRIPT_CHANNELS.stderr,
      data: data.toString('utf8'),
      type: TRANSCRIPT_LINE_TYPES.inbound,
    });
  });

  const exit = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.on('close', (code, signal) => resolve({ code, signal }));
  });

  if (pending !== '') {
    append({
      channel: TRANSCRIPT_CHANNELS.stdout,
      data: pending,
      type: TRANSCRIPT_LINE_TYPES.inbound,
    });
  }
  append({ ...exit, type: TRANSCRIPT_LINE_TYPES.exit });

  if (exit.signal !== null) {
    process.removeAllListeners(exit.signal);
    process.kill(process.pid, exit.signal);
    return;
  }
  process.exit(exit.code ?? 1);
}
