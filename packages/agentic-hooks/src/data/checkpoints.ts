/**
 * Per-session byte-offset checkpoints: how far into each append-only file a
 * session has already been read, so the next Stop reads only new bytes. Holds
 * identifiers and offsets ONLY — `{ path, offset, updated_at }` per file — and
 * knows nothing about the format of the files it tracks. Everything lives under
 * the telemetry directory, never a repo root. All fail-open.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import { logHookError } from '../utils/logging.ts';
import { defaultCheckpointsDir, sanitizeSessionId } from './jsonl.ts';

/**
 * A checkpoint older than this whose session is not the current one belongs to
 * a session that never came back. Matches the abandoned-starts window.
 *
 * @public
 */
export const DEFAULT_STALE_CHECKPOINT_MS = 6 * 60 * 60 * 1000;

/**
 * One tracked file's resume point.
 *
 * @public
 */
export interface OffsetCheckpoint {
  readonly offset: number;
  readonly path: string;
  readonly updated_at: string;
}

const checkpointFilePath = (dir: string, sessionId: string): string =>
  path.join(dir, `${sanitizeSessionId(sessionId)}.json`);

const isCheckpoint = (value: unknown): value is OffsetCheckpoint =>
  isRecord(value) &&
  typeof value.path === 'string' &&
  typeof value.offset === 'number' &&
  Number.isFinite(value.offset) &&
  value.offset >= 0 &&
  typeof value.updated_at === 'string';

const readSessionFile = (
  dir: string,
  sessionId: string,
): readonly OffsetCheckpoint[] => {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(checkpointFilePath(dir, sessionId), 'utf8'),
    );
    return isRecord(parsed) && Array.isArray(parsed.files)
      ? parsed.files.filter(isCheckpoint)
      : [];
  } catch {
    return [];
  }
};

const hasSessionId = (
  sessionId: string | null | undefined,
): sessionId is string =>
  typeof sessionId === 'string' && sessionId.trim() !== '';

/**
 * The checkpoint recorded for one file of a session, or null when there is
 * none (first read) or the store is unreadable.
 *
 * @public
 */
export const readCheckpoint = ({
  checkpointsDir,
  filePath,
  sessionId,
}: {
  checkpointsDir?: string;
  filePath: string;
  sessionId: string | null | undefined;
}): OffsetCheckpoint | null => {
  try {
    if (!hasSessionId(sessionId)) {
      return null;
    }
    const dir = checkpointsDir || defaultCheckpointsDir();
    return (
      readSessionFile(dir, sessionId.trim()).find(
        (entry) => entry.path === filePath,
      ) ?? null
    );
  } catch (err) {
    logHookError('readCheckpoint failed', err);
    return null;
  }
};

/**
 * Record how far into `filePath` a session has been read. Replaces any earlier
 * entry for that path and leaves the session's other files alone. Written to a
 * temp file and renamed, so a crash mid-write never leaves half a checkpoint.
 * Returns false (never throws) when it could not be written.
 *
 * @public
 */
export const writeCheckpoint = ({
  checkpointsDir,
  filePath,
  now = Date.now(),
  offset,
  sessionId,
}: {
  checkpointsDir?: string;
  filePath: string;
  now?: number;
  offset: number;
  sessionId: string | null | undefined;
}): boolean => {
  try {
    if (!hasSessionId(sessionId) || !Number.isFinite(offset) || offset < 0) {
      return false;
    }
    const dir = checkpointsDir || defaultCheckpointsDir();
    const sid = sessionId.trim();
    const files = [
      ...readSessionFile(dir, sid).filter((entry) => entry.path !== filePath),
      { offset, path: filePath, updated_at: new Date(now).toISOString() },
    ];

    const target = checkpointFilePath(dir, sid);
    const temp = `${target}.tmp.${process.pid}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(temp, `${JSON.stringify({ files })}\n`, 'utf8');
    fs.renameSync(temp, target);
    return true;
  } catch (err) {
    logHookError('writeCheckpoint failed', err);
    return false;
  }
};

/**
 * Remove the checkpoint files of sessions that went quiet: not the current
 * session and untouched for `maxAgeMs`. The same age rule as the abandoned
 * starts sweep. Returns how many were removed. Fail-open.
 *
 * @public
 */
export const sweepStaleCheckpoints = ({
  checkpointsDir,
  currentSessionId,
  maxAgeMs = DEFAULT_STALE_CHECKPOINT_MS,
  now = Date.now(),
}: {
  checkpointsDir?: string;
  currentSessionId?: string | null;
  maxAgeMs?: number;
  now?: number;
}): number => {
  const dir = checkpointsDir || defaultCheckpointsDir();
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return 0;
  }

  const currentName = hasSessionId(currentSessionId)
    ? `${sanitizeSessionId(currentSessionId.trim())}.json`
    : null;

  let swept = 0;
  for (const name of names) {
    if (!name.endsWith('.json') || name === currentName) {
      continue;
    }
    const filePath = path.join(dir, name);
    try {
      if (now - fs.statSync(filePath).mtimeMs < maxAgeMs) {
        continue;
      }
      fs.rmSync(filePath, { force: true });
      swept += 1;
    } catch (err) {
      logHookError('sweepStaleCheckpoints failed', err);
    }
  }

  return swept;
};
