/**
 * Claude Code per-request token capture, in two sections.
 *
 * - Parsing: {@link parseTranscriptLines} turns the complete lines of a session transcript into
 *   tool-neutral `TokenUsageRecord`s, one per API request. Knows nothing about files, offsets or
 *   the network.
 * - Capture: {@link captureTranscriptUsage} and {@link listSubagentTranscripts} read what a
 *   session's transcripts gained since the last `Stop` and send it.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  hasUsageCounts,
  normalizeUsage,
} from '@openthrottle/agentic-token-usage';
import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  HookFetch,
  PersistTokenUsageResult,
  TokenUsageAccount,
  TokenUsageRecord,
} from '../index.ts';
import {
  logHookError,
  persistTokenUsage,
  readCheckpoint,
  readNewBytes,
  scopeTokenUsageToRepo,
  sweepStaleCheckpoints,
  writeCheckpoint,
} from '../index.ts';
import { CLAUDE_SOURCE } from './claude-payload.ts';

// ── Parsing ──
// Claude Code transcript parsing — the Claude-specific half of per-request
// token capture. Turns the complete lines of a session transcript into
// tool-neutral `TokenUsageRecord`s, one per API request. Knows nothing about
// files, offsets or the network; the reader that drives it is the capture
// section below.
//
// Shape facts (pinned by `fixtures/claude/` at the package root):
//   - One API request is written as SEVERAL `assistant` lines (one per content
//     block), all carrying the same `requestId` and the SAME `message.usage`.
//     Counting lines instead of request ids would multiply the usage.
//   - `user` lines and `<synthetic>` assistant lines (local errors, no
//     `requestId`, all-zero usage) are not API requests.
//   - Subagent transcripts use the same line shape with `isSidechain: true` and
//     an `agentId`; their `sessionId` is the PARENT session's.

/** Provider stamped onto every row: the model vendor, not the harness. @public */
export const CLAUDE_PROVIDER = 'claude';

const SYNTHETIC_MODEL = '<synthetic>';

const nonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

const finiteNumber = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/**
 * Claude reports thinking tokens as `output_tokens_details.thinking_tokens`,
 * which `normalizeUsage` does not read (it only knows `reasoning_tokens`).
 */
const thinkingTokens = (usage: Record<string, unknown>): number | null => {
  return isRecord(usage.output_tokens_details)
    ? finiteNumber(usage.output_tokens_details.thinking_tokens)
    : null;
};

const parseJsonRecord = (line: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(line);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Map one transcript line to a usage record, or null when it is not a billable
 * API request (wrong type, no `requestId`, no `message.usage`, synthetic, or no
 * counts at all).
 */
const toRecord = (
  entry: Record<string, unknown>,
  fallbackSessionId: string | null,
): TokenUsageRecord | null => {
  if (entry.type !== 'assistant') {
    return null;
  }
  const requestId = nonEmptyString(entry.requestId);
  const { message } = entry;
  if (requestId === null || !isRecord(message) || !isRecord(message.usage)) {
    return null;
  }
  const model = nonEmptyString(message.model);
  if (model === null || model === SYNTHETIC_MODEL) {
    return null;
  }

  const { usage } = message;
  const counts = normalizeUsage({ model, usage });
  if (!hasUsageCounts(counts)) {
    return null;
  }

  const agentId = nonEmptyString(entry.agentId);
  return {
    cache_read_tokens: counts.cacheReadTokens ?? null,
    cache_write_tokens: counts.cacheWriteTokens ?? null,
    cost_usd: counts.costUsd ?? null,
    cwd: nonEmptyString(entry.cwd),
    git_branch: nonEmptyString(entry.gitBranch),
    input_tokens: counts.inputTokens ?? null,
    model,
    occurred_at: nonEmptyString(entry.timestamp) ?? new Date().toISOString(),
    output_tokens: counts.outputTokens ?? null,
    provider: CLAUDE_PROVIDER,
    raw_usage_json: JSON.stringify(
      agentId === null ? usage : { ...usage, agentId, isSidechain: true },
    ),
    reasoning_tokens: counts.reasoningTokens ?? thinkingTokens(usage),
    request_id: requestId,
    session_id: nonEmptyString(entry.sessionId) ?? fallbackSessionId,
    source: CLAUDE_SOURCE,
    total_tokens: counts.totalTokens ?? null,
  };
};

/**
 * Fold complete transcript lines into one record per `requestId`.
 *
 * Malformed lines and lines that are not API requests are skipped silently.
 * `seen` carries the request ids already emitted: the first line of a request
 * wins (its siblings carry identical usage), and passing one set across several
 * files of the same Stop keeps a request id from being emitted twice.
 *
 * @public
 */
export const parseTranscriptLines = ({
  fallbackSessionId,
  lines,
  seen,
}: {
  fallbackSessionId: string | null;
  lines: readonly string[];
  seen: Set<string>;
}): TokenUsageRecord[] => {
  const records: TokenUsageRecord[] = [];
  for (const line of lines) {
    const entry = parseJsonRecord(line);
    if (entry === null) {
      continue;
    }
    const record = toRecord(entry, fallbackSessionId);
    if (record === null || record.request_id === null) {
      continue;
    }
    if (seen.has(record.request_id)) {
      continue;
    }
    seen.add(record.request_id);
    records.push(record);
  }
  return records;
};

// ── Capture ──
// Per-request token capture for a Claude Code `Stop`: read what the session's
// transcripts gained since the last Stop, turn it into usage records and send
// them. Fail-open — nothing here throws, and a transcript that is missing,
// unreadable or malformed just yields no rows.
//
// Which files: the main transcript (`transcript_path`), every subagent
// transcript under `<transcript dir>/<session id>/subagents/agent-*.jsonl`, and
// a `SubagentStop`'s `agent_transcript_path`. Reading the subagent directory on
// a plain `Stop` is what captures subagent usage when `SubagentStop` is not
// registered, so it never needs to be.
//
// Each file has its own checkpoint (a byte offset) under the session id. The
// checkpoint only moves once the rows are accounted for (sent, or safely
// buffered or dead-lettered), and `readNewBytes` never consumes a line still
// being written, so a crash or an unfinished line is re-read, never dropped. The
// server dedupes on (source, session_id, request_id), which makes that re-read
// harmless.

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
): boolean => {
  return (
    result.buffered + result.deadLettered + result.inserted + result.skipped >=
    records
  );
};

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
  resolveAccount = async (): Promise<null> => {
    return null;
  },
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
  /**
   * The account these rows are billed to, asked only when there are rows to
   * send. Defaults to none (the rows go unattributed), which is what a
   * historical backfill wants: today's login says nothing about last month's.
   */
  resolveAccount?: () => Promise<TokenUsageAccount | null>;
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
      const account = await resolveAccount().catch(() => {
        return null;
      });
      const result = await persistTokenUsage({
        authToken,
        fetchImpl,
        graphqlUrl,
        jsonlPath,
        records: scopeTokenUsageToRepo(records, repoRoot).map((record) => {
          return { ...record, agent_account: account };
        }),
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
