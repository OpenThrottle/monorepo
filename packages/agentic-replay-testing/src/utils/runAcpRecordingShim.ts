/**
 * The ACP recording shim: installed as an ACP backend's `*_BIN`, it spawns the
 * real agent with exactly the args, env and stdio the production backend chose,
 * passes every byte through untouched, and appends what it saw to a capture
 * file as transcript lines — the argv, one `rpc` line per newline-delimited
 * JSON-RPC frame in wire order (`client` = our stdin, `agent` = its stdout),
 * stderr, and the exit. The header is the recorder's to add.
 *
 * Frames are sanitized and normalized as they are written, so the capture is
 * already committable. A line that is not a JSON object frame is kept on
 * stderr rather than lost. One shim run is one agent process lifetime; a
 * second run with the same capture path truncates the first.
 *
 * Node built-ins and sibling bin-side modules only: this runs under Node's
 * type stripping, outside Vite.
 */

import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';

import { isRecord } from '@openthrottle/nodejs-utils';

import type { TranscriptLine } from '../types/transcript.ts';
import {
  TRANSCRIPT_CHANNELS,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_RPC_DIRECTIONS,
} from '../types/transcript.ts';
import { createAcpNormalizer } from './acp-normalize.ts';
import { createLineSplitter } from './createLineSplitter.ts';
import { replayPaths } from './replayPaths.ts';
import { createSanitizer } from './sanitizer.ts';

/** @public */
export interface AcpRecordingShimOptions {
  /** Where to append the captured transcript lines. Truncated on start. */
  readonly capturePath: string;
  /** Absolute path of the real agent binary. */
  readonly realBin: string;
  /** JSON keys redacted wholesale in every frame (the backend's profile). */
  readonly redactKeys: readonly string[];
}

const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

function decodeFrame(line: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Entry point called by the generated bin.
 *
 * @public
 */
export async function runAcpRecordingShim(
  options: AcpRecordingShimOptions,
): Promise<void> {
  const append = (line: TranscriptLine): void => {
    appendFileSync(options.capturePath, `${JSON.stringify(line)}\n`, 'utf8');
  };
  const sanitizer = createSanitizer({
    paths: replayPaths(process.cwd()),
    redactKeys: options.redactKeys,
  });
  const normalizer = createAcpNormalizer({ sanitizer });

  const appendStderr = (text: string): void => {
    append({
      channel: TRANSCRIPT_CHANNELS.stderr,
      data: sanitizer.sanitizeText(text),
      type: TRANSCRIPT_LINE_TYPES.inbound,
    });
  };

  const record = (
    from: keyof typeof TRANSCRIPT_RPC_DIRECTIONS,
    line: string,
  ): void => {
    const message = decodeFrame(line);
    if (message === undefined) {
      appendStderr(`${line}\n`);
      return;
    }
    const frame = normalizer.normalizeFrame({ from, message });
    append({
      from: frame.from,
      message: frame.message,
      type: TRANSCRIPT_LINE_TYPES.rpc,
    });
  };

  const argv = process.argv.slice(2);
  writeFileSync(options.capturePath, '', 'utf8');
  append({
    argv: argv.map(sanitizer.sanitizeText),
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

  // The agent may exit before we finish writing to it.
  child.stdin.on('error', () => undefined);

  const fromClient = createLineSplitter((line) => {
    record(TRANSCRIPT_RPC_DIRECTIONS.client, line);
  });
  const fromAgent = createLineSplitter((line) => {
    record(TRANSCRIPT_RPC_DIRECTIONS.agent, line);
  });

  process.stdin.on('data', (data: Buffer) => {
    child.stdin.write(data);
    fromClient.push(data);
  });
  process.stdin.on('end', () => {
    child.stdin.end();
  });

  child.stdout.on('data', (data: Buffer) => {
    process.stdout.write(data);
    fromAgent.push(data);
  });

  child.stderr.on('data', (data: Buffer) => {
    process.stderr.write(data);
    appendStderr(data.toString('utf8'));
  });

  const exit = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.on('close', (code, signal) => resolve({ code, signal }));
  });

  fromClient.flush();
  fromAgent.flush();
  append({ ...exit, type: TRANSCRIPT_LINE_TYPES.exit });

  if (exit.signal !== null) {
    process.removeAllListeners(exit.signal);
    process.kill(process.pid, exit.signal);
    return;
  }
  process.exit(exit.code ?? 1);
}
