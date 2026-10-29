/**
 * JSONL sink + drain primitives and the canonical telemetry directory paths.
 */
import fs from 'node:fs';
import path from 'node:path';

import { userConfigDir } from '../config/env.ts';
import type { DrainFileResult, PostFailure, PostResult } from '../types.ts';
import { logHookError } from '../utils/logging.ts';

/**
 * Telemetry artifacts live in ONE directory, so a single override redirects all
 * of them. Basenames are fixed; only the directory is configurable.
 *
 * @public
 */
export const TELEMETRY_DIR_BASENAME = 'skill-usage';

/** @public */
export const EVENTS_JSONL_BASENAME = 'events.jsonl';

/** @public */
export const OUTCOMES_JSONL_BASENAME = 'outcomes.jsonl';

/** @public */
export const TOKEN_USAGE_JSONL_BASENAME = 'token-usage.jsonl';

/** @public */
export const STARTS_DIR_BASENAME = 'starts';

/** @public */
export const CHECKPOINTS_DIR_BASENAME = 'checkpoints';

/**
 * The directory holding buffered events, outcomes and start entries:
 * `~/.openthrottle/skill-usage/`, with `OPENTHROTTLE_TELEMETRY_DIR` overriding
 * it wholesale.
 *
 * User-global, NOT per repository. This plugin ships into other people's
 * checkouts, and the buffer used to land in `<repoRoot>/.cache/skill-usage/` —
 * i.e. inside whatever workspace the agent happened to be standing in, which
 * contradicted the plugin's own "never writes inside your repository" claim.
 * Nothing is lost by collapsing the directories: every buffered record already
 * carries `cwd` and `git_branch`, so repository identity lives in the data
 * rather than in the path, and the drain hook now has exactly one place to
 * look regardless of where a session ran.
 *
 * @public
 */
export const resolveTelemetryDir = (): string =>
  process.env.OPENTHROTTLE_TELEMETRY_DIR?.trim() ||
  path.join(userConfigDir(), TELEMETRY_DIR_BASENAME);

/**
 * Append one event as a JSONL line, creating parent dirs as needed.
 *
 * @public
 */
export const appendJsonl = (jsonlPath: string, event: object): void => {
  fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
  fs.appendFileSync(jsonlPath, `${JSON.stringify(event)}\n`, 'utf8');
};

/** @public */
export const defaultJsonlPath = (): string =>
  path.join(resolveTelemetryDir(), EVENTS_JSONL_BASENAME);

/** @public */
export const defaultOutcomesJsonlPath = (): string =>
  path.join(resolveTelemetryDir(), OUTCOMES_JSONL_BASENAME);

/** @public */
export const defaultTokenUsageJsonlPath = (): string =>
  path.join(resolveTelemetryDir(), TOKEN_USAGE_JSONL_BASENAME);

/** @public */
export const defaultCheckpointsDir = (): string =>
  path.join(resolveTelemetryDir(), CHECKPOINTS_DIR_BASENAME);

/**
 * The dead-letter sibling of a buffer file: `events.jsonl` →
 * `events.dead-letter.jsonl`. Lines land here when the server rejected the
 * payload itself, so retrying them could never succeed. Each line wraps the
 * original record with when and why, so nothing is discarded.
 *
 * @public
 */
export const deadLetterPathFor = (filePath: string): string =>
  filePath.replace(/\.jsonl$/, '') + '.dead-letter.jsonl';

/** One dead-letter line: the original record wrapped with when and why. */
const toDeadLetterLine = (
  record: unknown,
  reason: string,
  nowMs: number,
): string =>
  JSON.stringify({
    dead_lettered_at: new Date(nowMs).toISOString(),
    line: record,
    reason,
  });

/**
 * Append records straight to a buffer's dead-letter file — for a payload the
 * server has already rejected, which must not enter the retry loop at all.
 * Throws on I/O failure like `appendJsonl`; callers own the fail-open.
 *
 * @public
 */
export const appendDeadLetters = ({
  filePath,
  nowMs = Date.now(),
  reason,
  records,
}: {
  filePath: string;
  nowMs?: number;
  reason: string;
  records: readonly object[];
}): void => {
  if (!records.length) {
    return;
  }
  const deadPath = deadLetterPathFor(filePath);
  fs.mkdirSync(path.dirname(deadPath), { recursive: true });
  fs.appendFileSync(
    deadPath,
    `${records.map((record) => toDeadLetterLine(record, reason, nowMs)).join('\n')}\n`,
    'utf8',
  );
};

/**
 * Move every dead-lettered record back into its live buffer for another
 * attempt — the operator's lever after a server-side fix. Returns how many
 * lines were moved. Fail-open.
 *
 * @public
 */
export const replayDeadLetter = (filePath: string): number => {
  const deadPath = deadLetterPathFor(filePath);
  if (!fs.existsSync(deadPath)) {
    return 0;
  }

  const claimed = `${deadPath}.replaying.${process.pid}`;
  try {
    fs.renameSync(deadPath, claimed);
  } catch {
    return 0;
  }

  const lines: string[] = [];
  for (const raw of fs.readFileSync(claimed, 'utf8').split('\n')) {
    if (!raw.trim()) {
      continue;
    }
    try {
      const wrapped: unknown = JSON.parse(raw);
      lines.push(
        JSON.stringify(
          typeof wrapped === 'object' && wrapped !== null && 'line' in wrapped
            ? wrapped.line
            : wrapped,
        ),
      );
    } catch {
      logHookError('replay: skipping malformed dead-letter line');
    }
  }

  if (lines.length) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  }
  fs.rmSync(claimed, { force: true });

  return lines.length;
};

/** @public */
export const defaultStartsDir = (): string =>
  path.join(resolveTelemetryDir(), STARTS_DIR_BASENAME);

/**
 * A session id is used as a filename; keep it filesystem-safe.
 *
 * @public
 */
export const sanitizeSessionId = (sessionId: unknown): string =>
  String(sessionId).replace(/[^A-Za-z0-9._-]/g, '-');

/** @public */
export const startsFilePathForSession = (
  startsDir: string,
  sessionId: string,
): string => path.join(startsDir, `${sanitizeSessionId(sessionId)}.jsonl`);

/**
 * Stable key for a start entry — the dedupe / drain unit. Prefers tool_use_id
 * (unique per Skill-tool invocation) and falls back to started_at so repeated
 * invocations of the same slash skill in one session stay distinct.
 *
 * @public
 */
export const startCorrelationKey = (
  entry: Record<string, unknown> | null | undefined,
): string => {
  const sid = typeof entry?.session_id === 'string' ? entry.session_id : '';
  const skill = typeof entry?.skill_name === 'string' ? entry.skill_name : '';
  const toolUseId =
    typeof entry?.tool_use_id === 'string' ? entry.tool_use_id : '';
  const startedAt =
    typeof entry?.started_at === 'string' ? entry.started_at : '';
  const disc = toolUseId || startedAt;
  return `${sid}::${skill}::${disc}`;
};

/**
 * What a batch POST must report: delivered, or a classified failure.
 *
 * @public
 */
export type BatchPostResult = PostFailure | { ok: true };

interface Parsed<T> {
  event: T;
  raw: string;
}

/**
 * The shared drain mechanics: atomic rename to a private snapshot, post in
 * batches, retain transient failures, dead-letter permanent ones, fold the
 * snapshot back if it cannot be read. `drainJsonlFile` (one line per post) and
 * `drainJsonlFileBatched` are both thin wrappers over this.
 */
const drainSnapshot = async <T extends object>({
  batchSize,
  deadlineMs,
  filePath,
  nowFn,
  postBatch,
}: {
  batchSize: number;
  deadlineMs: number | undefined;
  filePath: string;
  nowFn: () => number;
  postBatch: (events: T[]) => Promise<BatchPostResult>;
}): Promise<DrainFileResult> => {
  const result: DrainFileResult = {
    deadLettered: 0,
    reasons: {},
    retained: 0,
    sent: 0,
    skipped: 0,
  };
  const tally = (reason: string, count: number): void => {
    result.reasons[reason] = (result.reasons[reason] ?? 0) + count;
  };
  if (!fs.existsSync(filePath)) {
    return result;
  }

  const snapshotPath = `${filePath}.draining.${process.pid}`;
  try {
    fs.renameSync(filePath, snapshotPath);
  } catch {
    // File vanished or was claimed by a concurrent drainer — nothing to do.
    return result;
  }

  const retain: string[] = [];
  const deadLetter: string[] = [];
  try {
    const parsed: Array<Parsed<T>> = [];
    for (const line of fs.readFileSync(snapshotPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        parsed.push({ event: JSON.parse(trimmed), raw: trimmed });
      } catch {
        result.skipped += 1;
        logHookError('drain: skipping malformed jsonl line');
      }
    }

    let stopped = false;
    for (
      let start = 0;
      start < parsed.length;
      start += Math.max(1, batchSize)
    ) {
      const batch = parsed.slice(start, start + Math.max(1, batchSize));

      if (!stopped && deadlineMs != null && nowFn() > deadlineMs) {
        stopped = true;
      }
      if (stopped) {
        retain.push(...batch.map((entry) => entry.raw));
        continue;
      }

      let res: BatchPostResult;
      try {
        // eslint-disable-next-line no-await-in-loop -- ordered, per-batch POST with retention semantics
        res = await postBatch(batch.map((entry) => entry.event));
      } catch (err) {
        logHookError('drain: post threw', err);
        res = { ok: false, permanent: false, reason: 'post threw' };
      }

      if (res.ok) {
        result.sent += batch.length;
      } else if (res.permanent) {
        tally(res.reason, batch.length);
        deadLetter.push(
          ...batch.map((entry) =>
            toDeadLetterLine(entry.event, res.reason, nowFn()),
          ),
        );
      } else {
        tally(res.reason, batch.length);
        retain.push(...batch.map((entry) => entry.raw));
      }
    }
  } catch (err) {
    // Read/parse of the snapshot failed before any post — fold it all back so
    // nothing is lost, then bail.
    logHookError('drainJsonlFile read failed', err);
    try {
      const leftover = fs.readFileSync(snapshotPath, 'utf8');
      if (leftover.trim()) {
        fs.appendFileSync(
          filePath,
          leftover.endsWith('\n') ? leftover : `${leftover}\n`,
          'utf8',
        );
      }

      fs.rmSync(snapshotPath, { force: true });
    } catch (foldErr) {
      logHookError('drain: fold-back failed', foldErr);
    }

    return result;
  }

  try {
    if (retain.length) {
      fs.appendFileSync(filePath, `${retain.join('\n')}\n`, 'utf8');
      result.retained = retain.length;
    }

    if (deadLetter.length) {
      fs.appendFileSync(
        deadLetterPathFor(filePath),
        `${deadLetter.join('\n')}\n`,
        'utf8',
      );
      result.deadLettered = deadLetter.length;
    }

    fs.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError('drain: finalize failed', err);
  }

  return result;
};

/**
 * Drain one buffered JSONL file to the server. Concurrent-writer safe via an
 * atomic rename: the live file is renamed to a private `.draining.<pid>`
 * snapshot (so writers immediately start a fresh file), the snapshot is posted
 * line-by-line, and any unsent/deadline-deferred lines are appended BACK to the
 * live file for the next attempt. Malformed lines are logged and dropped.
 * Nothing is lost on server-down (everything retained) and the operation is
 * idempotent — safe to re-run.
 *
 * A line the server rejects PERMANENTLY (validation, 4xx) moves to the
 * dead-letter file instead of being retried forever — 26 outcomes once sat in
 * the retry loop for six weeks behind a server bug, invisible. Every failure's
 * reason is tallied so the drain can say WHY it retained what it retained.
 *
 * @public
 */
export const drainJsonlFile = async <
  T extends object = Record<string, unknown>,
>({
  filePath,
  post,
  deadlineMs,
  nowFn = Date.now,
}: {
  deadlineMs?: number;
  filePath: string;
  nowFn?: () => number;
  post: (event: T) => Promise<PostResult>;
}): Promise<DrainFileResult> =>
  drainSnapshot<T>({
    batchSize: 1,
    deadlineMs,
    filePath,
    nowFn,
    postBatch: async ([event]) =>
      event === undefined ? { ok: true } : post(event),
  });

/**
 * `drainJsonlFile` for a stream whose server mutation takes many rows at once:
 * the same rename / retain / dead-letter mechanics, but lines are posted up to
 * `batchSize` at a time. The outcome is per batch — a batch the server rejects
 * permanently dead-letters every line in it with the reason, and a transient
 * failure retains every line in it. Delivery is idempotent server-side for the
 * streams that use this, so a retained batch re-sent later cannot double-count.
 *
 * @public
 */
export const drainJsonlFileBatched = async <
  T extends object = Record<string, unknown>,
>({
  batchSize,
  filePath,
  postBatch,
  deadlineMs,
  nowFn = Date.now,
}: {
  batchSize: number;
  deadlineMs?: number;
  filePath: string;
  nowFn?: () => number;
  postBatch: (events: readonly T[]) => Promise<BatchPostResult>;
}): Promise<DrainFileResult> =>
  drainSnapshot<T>({ batchSize, deadlineMs, filePath, nowFn, postBatch });
