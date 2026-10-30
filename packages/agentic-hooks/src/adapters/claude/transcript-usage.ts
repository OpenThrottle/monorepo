/**
 * Per-request token capture for a Claude Code `Stop`: read what the session's
 * transcripts gained since the last Stop, turn it into usage records and send
 * them. Fail-open — nothing here throws, and a transcript that is missing,
 * unreadable or malformed just yields no rows.
 *
 * Which files: the main transcript (`transcript_path`), every subagent
 * transcript under `<transcript dir>/<session id>/subagents/agent-*.jsonl`, and
 * a `SubagentStop`'s `agent_transcript_path`. Reading the subagent directory on
 * a plain `Stop` is what captures subagent usage when `SubagentStop` is not
 * registered, so it never needs to be.
 *
 * Each file has its own checkpoint (a byte offset) under the session id. The
 * checkpoint only moves once the rows are accounted for (sent, or safely
 * buffered or dead-lettered), and `readNewBytes` never consumes a line still
 * being written, so a crash or an unfinished line is re-read, never dropped. The
 * server dedupes on (source, session_id, request_id), which makes that re-read
 * harmless.
 */
import fs from 'node:fs';
import path from 'node:path';

import type {
  HookFetch,
  PersistTokenUsageResult,
  TokenUsageRecord,
} from '../../index.ts';
import {
  logHookError,
  persistTokenUsage,
  readCheckpoint,
  readNewBytes,
  sweepStaleCheckpoints,
  writeCheckpoint,
} from '../../index.ts';
import { parseTranscriptLines } from './transcript.ts';

/** Most bytes read from any one transcript per Stop. @public */
export const MAX_TRANSCRIPT_BYTES_PER_FILE = 4 * 1024 * 1024;

/** Most bytes read across all of a session's transcripts per Stop. @public */
export const MAX_TRANSCRIPT_BYTES_PER_STOP = 16 * 1024 * 1024;

const SUBAGENT_FILE = /^agent-.+\.jsonl$/;

/**
 * The subagent transcripts of the session whose main transcript is
 * `transcriptPath`: `<dir>/<session id>/subagents/agent-*.jsonl`, sorted so
 * reads are deterministic. Empty when the directory does not exist.
 *
 * @public
 */
export const listSubagentTranscripts = (
  transcriptPath: string,
): readonly string[] => {
  const { dir, name } = path.parse(transcriptPath);
  const subagentsDir = path.join(dir, name, 'subagents');
  try {
    return fs
      .readdirSync(subagentsDir)
      .filter((entry) => SUBAGENT_FILE.test(entry))
      .sort()
      .map((entry) => path.join(subagentsDir, entry));
  } catch {
    return [];
  }
};

/**
 * What one capture pass did.
 *
 * @public
 */
export interface CaptureTranscriptUsageResult {
  /** Whether the checkpoints moved (false when rows could not be accounted for). */
  readonly advanced: boolean;
  /** Transcript files that gained complete lines. */
  readonly filesRead: number;
  /** Usage rows built from the new lines. */
  readonly records: number;
}

interface PendingCheckpoint {
  readonly filePath: string;
  readonly offset: number;
}

const accountedFor = (
  result: PersistTokenUsageResult,
  records: number,
): boolean =>
  result.buffered + result.deadLettered + result.inserted + result.skipped >=
  records;

/**
 * Read the new transcript bytes for a session, send the usage rows, and move
 * the checkpoints. Never throws.
 *
 * @public
 */
export const captureTranscriptUsage = async ({
  agentTranscriptPath,
  authToken,
  checkpointsDir,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  repoRoot,
  sessionId,
  timeoutMs,
  transcriptPath,
}: {
  agentTranscriptPath: string | null;
  authToken?: string;
  checkpointsDir?: string;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  repoRoot: string;
  sessionId: string;
  timeoutMs?: number;
  transcriptPath: string | null;
}): Promise<CaptureTranscriptUsageResult> => {
  const idle: CaptureTranscriptUsageResult = {
    advanced: false,
    filesRead: 0,
    records: 0,
  };
  try {
    const targets = [
      ...new Set(
        [
          transcriptPath,
          ...(transcriptPath === null
            ? []
            : listSubagentTranscripts(transcriptPath)),
          agentTranscriptPath,
        ].filter((entry): entry is string => entry !== null),
      ),
    ];

    const seen = new Set<string>();
    const pending: PendingCheckpoint[] = [];
    const records: TokenUsageRecord[] = [];
    let budget = MAX_TRANSCRIPT_BYTES_PER_STOP;

    for (const filePath of targets) {
      if (budget <= 0) {
        break;
      }
      const prior =
        readCheckpoint({ checkpointsDir, filePath, sessionId })?.offset ?? 0;
      const { lines, nextOffset } = readNewBytes({
        filePath,
        maxBytes: Math.min(MAX_TRANSCRIPT_BYTES_PER_FILE, budget),
        offset: prior,
      });
      // A file shorter than the checkpoint was truncated: the read restarted at 0.
      budget -= nextOffset >= prior ? nextOffset - prior : nextOffset;
      if (nextOffset !== prior) {
        pending.push({ filePath, offset: nextOffset });
      }
      records.push(
        ...parseTranscriptLines({
          fallbackSessionId: sessionId,
          lines,
          seen,
        }),
      );
    }

    let advanced = true;
    if (records.length > 0) {
      const result = await persistTokenUsage({
        authToken,
        fetchImpl,
        graphqlUrl,
        jsonlPath,
        records,
        repoRoot,
        timeoutMs,
      });
      advanced = accountedFor(result, records.length);
    }
    if (advanced) {
      for (const { filePath, offset } of pending) {
        writeCheckpoint({ checkpointsDir, filePath, offset, sessionId });
      }
    }

    sweepStaleCheckpoints({ checkpointsDir, currentSessionId: sessionId });

    return {
      advanced: advanced && pending.length > 0,
      filesRead: pending.length,
      records: records.length,
    };
  } catch (err) {
    logHookError('captureTranscriptUsage failed', err);
    return idle;
  }
};
