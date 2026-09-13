/**
 * JSONL sink + drain primitives and the canonical telemetry directory paths.
 */
import fs from 'node:fs';
import path from 'node:path';

import { userConfigDir } from '../config/env.ts';
import type { DrainFileResult } from '../types.ts';
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
export const STARTS_DIR_BASENAME = 'starts';

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
 * Drain one buffered JSONL file to the server. Concurrent-writer safe via an
 * atomic rename: the live file is renamed to a private `.draining.<pid>`
 * snapshot (so writers immediately start a fresh file), the snapshot is posted
 * line-by-line, and any unsent/deadline-deferred lines are appended BACK to the
 * live file for the next attempt. Malformed lines are logged and dropped.
 * Nothing is lost on server-down (everything retained) and the operation is
 * idempotent — safe to re-run.
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
  post: (event: T) => Promise<{ ok: boolean; reason?: string }>;
}): Promise<DrainFileResult> => {
  const result: DrainFileResult = { retained: 0, sent: 0, skipped: 0 };
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
  try {
    let stopped = false;

    const lines = fs.readFileSync(snapshotPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      if (stopped) {
        retain.push(trimmed);
        continue;
      }

      if (deadlineMs != null && nowFn() > deadlineMs) {
        stopped = true;
        retain.push(trimmed);
        continue;
      }

      let event: T;
      try {
        event = JSON.parse(trimmed);
      } catch {
        result.skipped += 1;
        logHookError('drain: skipping malformed jsonl line');
        continue;
      }

      let ok = false;
      try {
        // eslint-disable-next-line no-await-in-loop -- ordered, per-line POST with retention semantics
        const res = await post(event);
        ok = Boolean(res && res.ok);
      } catch (err) {
        logHookError('drain: post threw', err);
      }

      if (ok) {
        result.sent += 1;
      } else {
        retain.push(trimmed);
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

    fs.rmSync(snapshotPath, { force: true });
  } catch (err) {
    logHookError('drain: finalize failed', err);
  }

  return result;
};
