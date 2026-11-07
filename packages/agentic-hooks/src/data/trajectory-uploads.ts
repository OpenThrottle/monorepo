/**
 * Per-session trajectory upload state: where the next scan of a session's
 * transcript resumes, the plan run found so far, and which task segments are
 * already accounted for. Identifiers and offsets only, under the telemetry
 * directory, never a repo root. Written to a temp file and renamed, so a crash
 * never leaves half a state file. All fail-open.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import { logHookError } from '../utils/logging.ts';
import { defaultTrajectoryUploadsDir, sanitizeSessionId } from './jsonl.ts';

/**
 * What a session's trajectory scans have settled so far.
 *
 * @public
 */
export interface TrajectoryUploadState {
  /** The plan run the session registered, once a scan has found it. */
  readonly planRunId: string | undefined;
  /** Byte offset the next scan resumes at. */
  readonly scanOffset: number;
  /** Segment keys already posted, buffered or dead-lettered. */
  readonly uploaded: readonly string[];
}

const stateFilePath = (dir: string, sessionId: string): string => {
  return path.join(dir, `${sanitizeSessionId(sessionId)}.json`);
};

/**
 * The state recorded for a session; a fresh one (offset 0, nothing uploaded)
 * when there is none or the file is unreadable.
 *
 * @public
 */
export const readTrajectoryUploadState = ({
  dir,
  sessionId,
}: {
  dir?: string;
  sessionId: string;
}): TrajectoryUploadState => {
  const fresh: TrajectoryUploadState = {
    planRunId: undefined,
    scanOffset: 0,
    uploaded: [],
  };
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(
        stateFilePath(dir || defaultTrajectoryUploadsDir(), sessionId),
        'utf8',
      ),
    );
    if (!isRecord(parsed)) {
      return fresh;
    }
    const isOffset =
      typeof parsed.scanOffset === 'number' &&
      Number.isFinite(parsed.scanOffset) &&
      parsed.scanOffset >= 0;
    const hasPlanRun =
      typeof parsed.planRunId === 'string' && parsed.planRunId !== '';
    const uploaded = Array.isArray(parsed.uploaded) ? parsed.uploaded : [];
    return {
      planRunId: hasPlanRun ? String(parsed.planRunId) : undefined,
      scanOffset: isOffset ? Number(parsed.scanOffset) : 0,
      uploaded: uploaded.filter((key): key is string => {
        return typeof key === 'string';
      }),
    };
  } catch {
    return fresh;
  }
};

/**
 * Persist a session's state. Returns false (never throws) when it could not be
 * written.
 *
 * @public
 */
export const writeTrajectoryUploadState = ({
  dir,
  sessionId,
  state,
}: {
  dir?: string;
  sessionId: string;
  state: TrajectoryUploadState;
}): boolean => {
  try {
    const target = stateFilePath(
      dir || defaultTrajectoryUploadsDir(),
      sessionId,
    );
    const temp = `${target}.tmp.${process.pid}`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      temp,
      `${JSON.stringify({
        planRunId: state.planRunId,
        scanOffset: state.scanOffset,
        uploaded: state.uploaded,
      })}\n`,
      'utf8',
    );
    fs.renameSync(temp, target);
    return true;
  } catch (err) {
    logHookError('writeTrajectoryUploadState failed', err);
    return false;
  }
};

/** Default age, in days, after which a session's upload state file is swept. @public */
export const DEFAULT_TRAJECTORY_STATE_TTL_DAYS = 30;

/** Marker file whose mtime records the last sweep, so a sweep runs at most once a day. */
const SWEEP_MARKER_BASENAME = '.last-sweep';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The state-file TTL in days: `OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS` when it is a
 * positive number, else {@link DEFAULT_TRAJECTORY_STATE_TTL_DAYS}.
 *
 * @public
 */
export const resolveTrajectoryStateTtlDays = (): number => {
  const raw = Number(
    process.env.OPENTHROTTLE_SESSION_TRAJECTORY_STATE_TTL_DAYS,
  );

  return Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_TRAJECTORY_STATE_TTL_DAYS;
};

/**
 * What one sweep did.
 *
 * @public
 */
export interface SweepTrajectoryUploadStateResult {
  /** State files deleted. */
  readonly deleted: number;
  /** True when the once-a-day marker was fresh, so nothing was scanned. */
  readonly skipped: boolean;
}

const deleteIfOlder = async (
  filePath: string,
  cutoffMs: number,
): Promise<boolean> => {
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.mtimeMs >= cutoffMs) {
      return false;
    }
    await fs.promises.unlink(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Delete per-session state files (`<sessionId>.json`) not written for `ttlDays`.
 * Safe because every upload carries an idempotency key: a session that resumes
 * after its state was swept rescans from offset 0 and the server turns each
 * already-recorded segment into a no-op. Runs at most once a day (an mtime marker), and never
 * throws.
 *
 * @public
 */
export const sweepTrajectoryUploadState = async ({
  dir,
  nowMs = Date.now(),
  ttlDays = resolveTrajectoryStateTtlDays(),
}: {
  dir?: string;
  nowMs?: number;
  ttlDays?: number;
} = {}): Promise<SweepTrajectoryUploadStateResult> => {
  try {
    const target = dir || defaultTrajectoryUploadsDir();
    const marker = path.join(target, SWEEP_MARKER_BASENAME);

    try {
      const { mtimeMs } = await fs.promises.stat(marker);
      if (nowMs - mtimeMs < MS_PER_DAY) {
        return { deleted: 0, skipped: true };
      }
    } catch {
      // No marker yet: sweep.
    }

    const names = await fs.promises.readdir(target);
    const cutoffMs = nowMs - ttlDays * MS_PER_DAY;
    const results = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map((name) => deleteIfOlder(path.join(target, name), cutoffMs)),
    );

    await fs.promises.writeFile(marker, `${new Date(nowMs).toISOString()}\n`);
    await fs.promises.utimes(marker, new Date(nowMs), new Date(nowMs));

    return { deleted: results.filter(Boolean).length, skipped: false };
  } catch (err) {
    if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
      logHookError('sweepTrajectoryUploadState failed', err);
    }
    return { deleted: 0, skipped: false };
  }
};
