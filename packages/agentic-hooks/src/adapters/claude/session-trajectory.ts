/**
 * Task trajectory upload for a Claude Code `Stop`: read what the session
 * transcript gained since the last Stop, cut it into OpenThrottle task segments
 * (one per `begin_task_session`), and send each CLOSED segment's trajectory once,
 * subagents embedded. Fail-open: nothing here throws, and a transcript that is
 * missing, unreadable or malformed just uploads nothing.
 *
 * A session that never called `begin_task_session` uploads nothing. Set
 * `OPENTHROTTLE_SESSION_TRAJECTORIES=0` to turn the whole thing off.
 *
 * State (`data/trajectory-uploads.ts`) holds the resume offset, the plan run
 * once found, and the segment keys already accounted for. The offset only ever
 * advances to the start of the first segment that is still open or still
 * waiting to be sent, so a segment is never cut in half and never lost; the
 * keys make a re-read of an already-sent segment a no-op.
 */
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';
import {
  buildClaudeSessionTrajectory,
  findClaudeSessionPlanRunId,
  findClaudeSessionSubagentIds,
  findClaudeSessionTaskSegments,
} from '@openthrottle/openthrottle-agentic-utils';

import type { HookFetch } from '../../index.ts';
import {
  logHookError,
  persistTrajectory,
  readNewBytes,
  readNewLines,
  readPlanRunIdForSession,
  readTrajectoryUploadState,
  writeTrajectoryUploadState,
} from '../../index.ts';

/** `source` stamped on every trajectory this path uploads. @public */
export const SESSION_TRAJECTORY_SOURCE = 'session_upload';

/** `driver` stamped on every trajectory this path uploads. @public */
export const SESSION_TRAJECTORY_DRIVER = 'claude';

/** Most bytes of the main transcript read per Stop. @public */
export const MAX_SESSION_SCAN_BYTES_PER_STOP = 32 * 1024 * 1024;

/** Most bytes read from any one subagent transcript. @public */
export const MAX_SUBAGENT_TRANSCRIPT_BYTES = 4 * 1024 * 1024;

/** Longest a Stop spends sending trajectories before leaving the rest. @public */
export const DEFAULT_SESSION_TRAJECTORY_BUDGET_MS = 4000;

const SAFE_AGENT_ID = /^[A-Za-z0-9_-]+$/;

/**
 * What one capture pass did.
 *
 * @public
 */
export interface CaptureSessionTrajectoriesResult {
  /** Segments accounted for this pass (sent, buffered, dead-lettered or empty). */
  readonly handled: number;
  /** Why nothing was done, when that is the whole story. */
  readonly skipped: string | undefined;
}

interface ScannedEvent {
  readonly event: unknown;
  readonly offset: number;
}

const parseJsonLines = (lines: readonly string[]): readonly unknown[] => {
  return lines.flatMap((line): unknown[] => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
};

const firstVersionOf = (events: readonly unknown[]): string => {
  for (const event of events) {
    if (isRecord(event) && typeof event.version === 'string') {
      return event.version;
    }
  }

  return 'unknown';
};

const loadSubagents = (
  transcriptPath: string,
  sessionId: string,
  agentIds: readonly string[],
): readonly {
  readonly agentId: string;
  readonly events: readonly unknown[];
}[] => {
  const subagentsDir = path.join(
    path.dirname(transcriptPath),
    sessionId,
    'subagents',
  );

  return agentIds.flatMap((agentId) => {
    if (!SAFE_AGENT_ID.test(agentId)) {
      return [];
    }
    const { lines } = readNewBytes({
      filePath: path.join(subagentsDir, `agent-${agentId}.jsonl`),
      maxBytes: MAX_SUBAGENT_TRANSCRIPT_BYTES,
      offset: 0,
    });

    return lines.length === 0
      ? []
      : [{ agentId, events: parseJsonLines(lines) }];
  });
};

/**
 * Upload the closed task segments the session transcript gained since the last
 * Stop. Never throws.
 *
 * @public
 */
export const captureSessionTrajectories = async ({
  authToken,
  budgetMs = DEFAULT_SESSION_TRAJECTORY_BUDGET_MS,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  nowFn = Date.now,
  repoRoot,
  sessionId,
  timeoutMs,
  transcriptPath,
  uploadsDir,
}: {
  authToken?: string;
  budgetMs?: number;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  nowFn?: () => number;
  repoRoot: string;
  sessionId: string;
  timeoutMs?: number;
  transcriptPath: string | null;
  uploadsDir?: string;
}): Promise<CaptureSessionTrajectoriesResult> => {
  try {
    if (process.env.OPENTHROTTLE_SESSION_TRAJECTORIES === '0') {
      return { handled: 0, skipped: 'OPENTHROTTLE_SESSION_TRAJECTORIES=0' };
    }
    if (transcriptPath === null) {
      return { handled: 0, skipped: 'no transcript path' };
    }

    const state = readTrajectoryUploadState({ dir: uploadsDir, sessionId });
    const read = readNewLines({
      filePath: transcriptPath,
      maxBytes: MAX_SESSION_SCAN_BYTES_PER_STOP,
      offset: state.scanOffset,
    });

    const scanned: ScannedEvent[] = read.lines.flatMap((line) => {
      return parseJsonLines([line.text]).map((event) => {
        return { event, offset: line.offset };
      });
    });
    const events = scanned.map((entry) => entry.event);

    const planRunId =
      findClaudeSessionPlanRunId(events) ??
      state.planRunId ??
      readPlanRunIdForSession({ repoRoot, sessionId });
    const agentVersion = firstVersionOf(events);
    const deadline = nowFn() + budgetMs;
    const uploaded = new Set(state.uploaded);

    let firstPendingOffset: number | undefined;
    let handled = 0;

    for (const segment of findClaudeSessionTaskSegments(events)) {
      if (uploaded.has(segment.toolUseId)) {
        continue;
      }

      const offset = scanned[segment.startIndex]?.offset ?? read.nextOffset;
      const isOversized =
        !segment.closed && read.capped && segment.startIndex === 0;
      if (isOversized) {
        // Larger than one scan window and still open: the offset could never
        // move past it, so account for it rather than rescan it forever.
        logHookError(
          `trajectory segment ${segment.taskId} exceeds scan window`,
        );
        uploaded.add(segment.toolUseId);
        handled += 1;
        continue;
      }

      // A session can register more than one run: a segment belongs to the run registered before
      // it began, falling back to the session's (or the backstop file's) run.
      const segmentRunId =
        findClaudeSessionPlanRunId(events.slice(0, segment.startIndex)) ??
        planRunId;
      const isReady =
        segment.closed && segmentRunId !== undefined && nowFn() <= deadline;
      if (!isReady) {
        firstPendingOffset ??= offset;
        continue;
      }

      const segmentEvents = events.slice(segment.startIndex, segment.endIndex);
      const built = buildClaudeSessionTrajectory({
        agentVersion,
        openthrottle: {
          planId: segment.planId,
          planRunId: segmentRunId,
          sessionId,
          taskId: segment.taskId,
        },
        segmentEvents,
        subagents: loadSubagents(
          transcriptPath,
          sessionId,
          findClaudeSessionSubagentIds(segmentEvents),
        ),
        taskId: segment.taskId,
      });

      if (built === undefined) {
        uploaded.add(segment.toolUseId);
        handled += 1;
        continue;
      }

      // eslint-disable-next-line no-await-in-loop -- sequential on purpose: stop contacting a failing server and keep uploads ordered
      const result = await persistTrajectory(
        {
          driver: SESSION_TRAJECTORY_DRIVER,
          durationMs: built.durationMs,
          exitCode: null,
          model: built.model ?? null,
          outcome: built.outcome,
          planRunId: segmentRunId,
          source: SESSION_TRAJECTORY_SOURCE,
          taskId: segment.taskId,
          trajectoryJson: built.trajectoryJson,
        },
        { authToken, fetchImpl, graphqlUrl, jsonlPath, repoRoot, timeoutMs },
      );

      if (result.sink === 'dropped') {
        firstPendingOffset ??= offset;
        continue;
      }
      uploaded.add(segment.toolUseId);
      handled += 1;
    }

    writeTrajectoryUploadState({
      dir: uploadsDir,
      sessionId,
      state: {
        planRunId,
        scanOffset: firstPendingOffset ?? read.nextOffset,
        uploaded: [...uploaded],
      },
    });

    return { handled, skipped: undefined };
  } catch (err) {
    logHookError('captureSessionTrajectories failed', err);
    return { handled: 0, skipped: 'error' };
  }
};
