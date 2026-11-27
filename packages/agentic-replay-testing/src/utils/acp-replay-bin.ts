/**
 * The ACP replay bin: installed as an ACP backend's `*_BIN`, it stands in for
 * the agent process and replays a recorded {@link AcpTranscript} causally.
 *
 * It walks the recorded frames in order. A recorded client frame is awaited,
 * normalized by the SAME normalizer the recorder used (one per run, fed in wire
 * order: the client's frames as received and the agent's as emitted) and
 * compared strictly with the recording. A recorded agent frame is emitted only
 * once every client frame recorded before it has matched, so replay never
 * depends on timing. A mismatch exits {@link REPLAY_MISMATCH_EXIT_CODE} with a
 * diff on stderr and streams nothing further.
 *
 * Ids and UUIDs: a recorded agent response carries the normalized id of the
 * client request it answers, so it is emitted with that request's live id;
 * agent-originated requests keep their recorded id. Recorded placeholder UUIDs
 * are emitted as live-looking UUIDs, so the normalizer maps them back in the
 * same order of appearance as the recording; `<CWD>` becomes this process's cwd.
 *
 * After the script ends the process idles until stdin closes or SIGINT/SIGTERM,
 * then exits as recorded (a signal-terminated recording exits 0). Every state
 * change rewrites the {@link ReplayReport}, so a SIGKILL still leaves the truth
 * on disk; the exit file says the process is gone.
 *
 * Node built-ins and sibling bin-side modules only: this runs under Node's
 * type stripping, outside Vite.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

import { isRecord } from '@openthrottle/nodejs-utils';

import type { AcpFrame, AcpMessage } from '../types/transcript.ts';
import { TRANSCRIPT_PROTOCOLS } from '../types/transcript.ts';
import { createAcpNormalizer, mapStrings } from './acp-normalize.ts';
import { createLineSplitter } from './createLineSplitter.ts';
import type { ReplayReport } from './replay-bin.ts';
import {
  describeMismatch,
  REPLAY_MISMATCH_EXIT_CODE,
  trapTermination,
} from './replay-bin.ts';
import { replayPaths } from './replayPaths.ts';
import { createSanitizer } from './sanitizer.ts';
import { parseTranscript } from './transcript.ts';

/** @public */
export interface AcpReplayBinOptions {
  /** Written with `{ code }` when the process exits: the backend's cue it is gone. */
  readonly exitPath: string;
  /** Same list the recorder used (`acpRedactKeys` of the backend profile). */
  readonly redactKeys: readonly string[];
  readonly reportPath: string;
  readonly transcriptPath: string;
}

const PLACEHOLDER_UUID = /00000000-0000-4000-8000-([0-9a-f]{12})/gi;

const LIVE_UUID_PREFIX = '11111111-1111-4111-8111-';

/**
 * The UUID a replay hands the client for a recorded placeholder UUID. It is
 * not a placeholder, so the normalizer maps it again, in order of appearance.
 *
 * @public
 */
export function toLiveUuid(text: string): string {
  return text.replace(PLACEHOLDER_UUID, `${LIVE_UUID_PREFIX}$1`);
}

function decodeFrame(line: string): AcpMessage {
  try {
    const value: unknown = JSON.parse(line);
    return isRecord(value) ? value : { unparsed: line };
  } catch {
    return { unparsed: line };
  }
}

/**
 * Entry point called by the generated bin.
 *
 * @public
 */
export async function runAcpReplayBin(
  options: AcpReplayBinOptions,
): Promise<void> {
  const report = (value: ReplayReport): void => {
    writeFileSync(options.reportPath, JSON.stringify(value), 'utf8');
  };
  const leave = (code: number): never => {
    writeFileSync(options.exitPath, JSON.stringify({ code }), 'utf8');
    process.exit(code);
  };
  const fail = (value: ReplayReport): never => {
    report(value);
    process.stderr.write(describeMismatch(value));
    return leave(REPLAY_MISMATCH_EXIT_CODE);
  };

  const parsed = parseTranscript(readFileSync(options.transcriptPath, 'utf8'));
  if (!parsed.ok) {
    return fail({ error: parsed.error, kind: 'transcript', ok: false });
  }
  const { transcript } = parsed;
  if (transcript.protocol !== TRANSCRIPT_PROTOCOLS.acp) {
    return fail({
      error: 'a cli transcript cannot be replayed as acp',
      kind: 'transcript',
      ok: false,
    });
  }

  const sanitizer = createSanitizer({
    paths: replayPaths(process.cwd()),
    redactKeys: options.redactKeys,
  });
  const argv = process.argv.slice(2).map(sanitizer.sanitizeText);
  const argvMatches =
    argv.length === transcript.argv.length &&
    argv.every((value, index) => value === transcript.argv[index]);
  if (!argvMatches) {
    return fail({
      expected: transcript.argv,
      kind: 'argv',
      ok: false,
      received: argv,
    });
  }

  const { frames } = transcript;
  const normalizer = createAcpNormalizer({ sanitizer });
  /** Normalized client request id → the id the client really used. */
  const liveIds = new Map<unknown, unknown>();
  let cursor = 0;

  const state = (): ReplayReport => {
    const next = frames[cursor];
    if (next === undefined) {
      return { ok: true };
    }
    return {
      expected: next.message,
      index: cursor,
      kind: 'incomplete',
      ok: false,
    };
  };

  const emit = (frame: AcpFrame): void => {
    const live = mapStrings(frame.message, (text) => {
      return toLiveUuid(text).split('<CWD>').join(process.cwd());
    });
    let message: AcpMessage = isRecord(live) ? live : frame.message;
    const isResponse = 'id' in message && !('method' in message);
    if (isResponse && liveIds.has(message.id)) {
      message = { ...message, id: liveIds.get(message.id) };
    }
    // Fed as emitted, so ids and UUID placeholders line up with the recording.
    normalizer.normalizeFrame({ from: frame.from, message });
    process.stdout.write(`${JSON.stringify(message)}\n`);
  };

  /** Emit recorded agent frames until the next client frame (or the end). */
  const advance = (): void => {
    let next = frames[cursor];
    while (next?.from === 'agent') {
      emit(next);
      cursor += 1;
      next = frames[cursor];
    }
    report(state());
  };

  const receive = (line: string): void => {
    const raw = decodeFrame(line);
    const expected = frames[cursor];
    const received = normalizer.normalizeFrame({
      from: 'client',
      message: raw,
    });

    if (
      expected === undefined ||
      !isDeepStrictEqual(received.message, expected.message)
    ) {
      fail({
        expected: expected?.message ?? null,
        index: cursor,
        kind: 'rpc',
        ok: false,
        received: received.message,
      });
      return;
    }
    if ('method' in raw && 'id' in raw) {
      liveIds.set(received.message.id, raw.id);
    }
    cursor += 1;
    advance();
  };

  // Handlers go on before any output: the backend may signal at any moment.
  const trapped = trapTermination();
  const stopped = new Promise<void>((resolve) => {
    process.stdin.on('end', resolve);
  });
  const lines = createLineSplitter(receive);
  process.stdin.on('data', (data: Buffer) => {
    lines.push(data);
  });

  if (transcript.stderr !== '') {
    process.stderr.write(transcript.stderr);
  }
  advance();

  await Promise.race([trapped, stopped]);
  lines.flush();

  const left = state();
  if (!left.ok) {
    fail(left);
  }
  leave(transcript.exit.code ?? 0);
}
