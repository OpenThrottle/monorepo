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
