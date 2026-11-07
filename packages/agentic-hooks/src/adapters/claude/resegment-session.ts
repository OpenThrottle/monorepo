/**
 * Re-derive session_upload trajectories from a Claude Code transcript with the
 * current task-boundary rules, then match each segment to an existing row
 * (same task id, else same idempotency key) so labels survive an in-place
 * replace. Plan-level segments with no match insert as new rows.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';
import {
  buildClaudeSessionTrajectory,
  findClaudeSessionPlanRunId,
  findClaudeSessionSubagentIds,
  findClaudeSessionTaskSegments,
} from '@openthrottle/openthrottle-agentic-utils';

import type {
  HookFetch,
  StoredTrajectoryRow,
  TrajectoryInput,
} from '../../index.ts';
import {
  fetchTrajectoriesByPlanRun,
  fetchTrajectoriesByTask,
  postTrajectory,
  readNewBytes,
  replaceTrajectory,
} from '../../index.ts';

/** Most bytes read from the main transcript for one resegment. @public */
export const MAX_RESEGMENT_TRANSCRIPT_BYTES = 64 * 1024 * 1024;

/** Most bytes read from any one subagent transcript. @public */
export const MAX_RESEGMENT_SUBAGENT_BYTES = 4 * 1024 * 1024;

const SAFE_AGENT_ID = /^[A-Za-z0-9_-]+$/;

const SESSION_TRAJECTORY_SOURCE = 'session_upload';
const SESSION_TRAJECTORY_DRIVER = 'claude';

/**
 * One planned write for a resegment: update keeps the row id; insert creates a
 * plan-level (or unmatched) row; skip is a byte-identical second pass.
 *
 * @public
 */
export type ResegmentAction =
  | {
      readonly action: 'insert';
      readonly input: TrajectoryInput;
      readonly newStepCount: number;
      readonly taskId: string | null;
    }
  | {
      readonly action: 'skip';
      readonly id: string;
      readonly newStepCount: number;
      readonly oldStepCount: number;
      readonly taskId: string | null;
    }
  | {
      readonly action: 'update';
      readonly id: string;
      readonly input: TrajectoryInput;
      readonly newStepCount: number;
      readonly oldStepCount: number;
      readonly taskId: string | null;
    };

/**
 * What one session's resegment is about to do.
 *
 * @public
 */
export interface ResegmentSessionPlan {
  readonly actions: readonly ResegmentAction[];
  readonly openSegments: number;
  readonly sessionId: string;
  readonly transcriptPath: string;
}

/**
 * What a real (non-dry) send did for one session.
 *
 * @public
 */
export interface ResegmentSessionResult {
  readonly failed: number;
  readonly inserted: number;
  readonly replaced: number;
  readonly skipped: number;
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
      maxBytes: MAX_RESEGMENT_SUBAGENT_BYTES,
      offset: 0,
    });
    return lines.length === 0
      ? []
      : [{ agentId, events: parseJsonLines(lines) }];
  });
};

/**
 * Locate `<sessionId>.jsonl` under a Claude projects directory. Returns null
 * when none exists; when several match, the lexicographically first path wins.
 *
 * @public
 */
export const findSessionTranscriptPath = ({
  projectsDir,
  sessionId,
}: {
  projectsDir: string;
  sessionId: string;
}): string | null => {
  if (!fs.existsSync(projectsDir)) {
    return null;
  }
  const fileName = `${sessionId}.jsonl`;
  const matches: string[] = [];
  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(projectsDir, entry.name, fileName);
    if (fs.existsSync(candidate)) {
      matches.push(candidate);
    }
  }
  matches.sort((left, right) => {
    return left.localeCompare(right);
  });
  return matches[0] ?? null;
};

const stepCountOfJson = (trajectoryJson: string): number => {
  try {
    const parsed: unknown = JSON.parse(trajectoryJson);
    return isRecord(parsed) && Array.isArray(parsed.steps)
      ? parsed.steps.length
      : 0;
  } catch {
    return 0;
  }
};

/** Stable JSON so a server round-trip with different key order still matches. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort((left, right) => {
      return left.localeCompare(right);
    });
    return `{${keys
      .map((key) => {
        return `${JSON.stringify(key)}:${stableStringify(value[key])}`;
      })
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const sameTrajectoryJson = (left: string, right: string): boolean => {
  try {
    return (
      stableStringify(JSON.parse(left)) === stableStringify(JSON.parse(right))
    );
  } catch {
    return left === right;
  }
};

const matchExisting = ({
  existing,
  idempotencyKey,
  taskId,
}: {
  existing: readonly StoredTrajectoryRow[];
  idempotencyKey: string;
  taskId: string | null;
}): StoredTrajectoryRow | undefined => {
  if (taskId !== null) {
    const byTask = existing.find((row) => {
      return row.source === SESSION_TRAJECTORY_SOURCE && row.taskId === taskId;
    });
    if (byTask !== undefined) {
      return byTask;
    }
  }
  return existing.find((row) => {
    return (
      row.source === SESSION_TRAJECTORY_SOURCE &&
      row.idempotencyKey === idempotencyKey
    );
  });
};

/**
 * Build the resegment plan for one session: read the transcript, cut segments,
 * fetch existing session_upload rows for every plan run the transcript
 * registered, and decide update / insert / skip per segment.
 *
 * @public
 */
export const planSessionResegment = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  projectsDir,
  sessionId,
  timeoutMs,
}: {
  authToken: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string;
  projectsDir: string;
  sessionId: string;
  timeoutMs: number;
}): Promise<
  | { readonly error: string; readonly kind: 'error' }
  | { readonly kind: 'plan'; readonly plan: ResegmentSessionPlan }
> => {
  const transcriptPath = findSessionTranscriptPath({ projectsDir, sessionId });
  if (transcriptPath === null) {
    return {
      error: `no transcript for session ${sessionId} under ${projectsDir}`,
      kind: 'error',
    };
  }

  const { lines } = readNewBytes({
    filePath: transcriptPath,
    maxBytes: MAX_RESEGMENT_TRANSCRIPT_BYTES,
    offset: 0,
  });
  const events = parseJsonLines(lines);
  const agentVersion = firstVersionOf(events);
  const segments = findClaudeSessionTaskSegments(events);
  const closed = segments.filter((segment) => {
    return segment.closed;
  });
  const openSegments = segments.length - closed.length;

  const planRunIds = [
    ...new Set(
      closed.flatMap((segment) => {
        const runId =
          findClaudeSessionPlanRunId(events.slice(0, segment.startIndex)) ??
          findClaudeSessionPlanRunId(events);
        return runId === undefined ? [] : [runId];
      }),
    ),
  ];
  const taskIds = [
    ...new Set(
      closed.flatMap((segment) => {
        return segment.taskId === null ? [] : [segment.taskId];
      }),
    ),
  ];

  const existingById = new Map<string, StoredTrajectoryRow>();
  const mergeRows = (rows: readonly StoredTrajectoryRow[]): void => {
    for (const row of rows) {
      existingById.set(row.id, row);
    }
  };

  for (const planRunId of planRunIds) {
    // eslint-disable-next-line no-await-in-loop -- sequential so one plan-run failure stops the session cleanly
    const fetched = await fetchTrajectoriesByPlanRun({
      authToken,
      fetchImpl,
      graphqlUrl,
      planRunId,
      timeoutMs,
    });
    if (!fetched.ok) {
      return {
        error: `failed to list trajectories for plan run ${planRunId}: ${fetched.reason}`,
        kind: 'error',
      };
    }
    mergeRows(fetched.rows);
  }

  for (const taskId of taskIds) {
    // eslint-disable-next-line no-await-in-loop -- sequential so one task failure stops the session cleanly
    const fetched = await fetchTrajectoriesByTask({
      authToken,
      fetchImpl,
      graphqlUrl,
      taskId,
      timeoutMs,
    });
    if (!fetched.ok) {
      return {
        error: `failed to list trajectories for task ${taskId}: ${fetched.reason}`,
        kind: 'error',
      };
    }
    mergeRows(fetched.rows);
  }

  const existingRows = [...existingById.values()];

  const claimedIds = new Set<string>();
  const actions: ResegmentAction[] = [];

  for (const segment of closed) {
    const segmentRunId =
      findClaudeSessionPlanRunId(events.slice(0, segment.startIndex)) ??
      findClaudeSessionPlanRunId(events);
    if (segmentRunId === undefined) {
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
      continue;
    }

    const idempotencyKey = `session:${sessionId}:${segment.toolUseId}`;
    const input: TrajectoryInput = {
      driver: SESSION_TRAJECTORY_DRIVER,
      durationMs: built.durationMs,
      exitCode: null,
      idempotencyKey,
      model: built.model ?? null,
      outcome: built.outcome,
      planRunId: segmentRunId,
      source: SESSION_TRAJECTORY_SOURCE,
      taskId: segment.taskId,
      trajectoryJson: built.trajectoryJson,
    };
    const newStepCount = stepCountOfJson(built.trajectoryJson);
    const available = existingRows.filter((row) => {
      return !claimedIds.has(row.id);
    });
    const matched = matchExisting({
      existing: available,
      idempotencyKey,
      taskId: segment.taskId,
    });

    if (matched === undefined) {
      actions.push({
        action: 'insert',
        input,
        newStepCount,
        taskId: segment.taskId,
      });
      continue;
    }

    claimedIds.add(matched.id);
    if (sameTrajectoryJson(matched.trajectoryJson, built.trajectoryJson)) {
      actions.push({
        action: 'skip',
        id: matched.id,
        newStepCount,
        oldStepCount: matched.stepCount,
        taskId: segment.taskId,
      });
      continue;
    }

    actions.push({
      action: 'update',
      id: matched.id,
      input,
      newStepCount,
      oldStepCount: matched.stepCount,
      taskId: segment.taskId,
    });
  }

  return {
    kind: 'plan',
    plan: {
      actions,
      openSegments,
      sessionId,
      transcriptPath,
    },
  };
};

/**
 * Apply a session plan: replace matched rows in place, insert the rest.
 *
 * @public
 */
export const applySessionResegment = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  plan,
  timeoutMs,
}: {
  authToken: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string;
  plan: ResegmentSessionPlan;
  timeoutMs: number;
}): Promise<ResegmentSessionResult> => {
  let inserted = 0;
  let replaced = 0;
  let skipped = 0;
  let failed = 0;

  for (const action of plan.actions) {
    if (action.action === 'skip') {
      skipped += 1;
      continue;
    }
    if (action.action === 'insert') {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose: keep uploads ordered and stop on a failing server
      const result = await postTrajectory({
        authToken,
        fetchImpl,
        graphqlUrl,
        input: action.input,
        timeoutMs,
      });
      if (result.ok) {
        inserted += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    // eslint-disable-next-line no-await-in-loop -- sequential on purpose
    const result = await replaceTrajectory({
      authToken,
      fetchImpl,
      graphqlUrl,
      id: action.id,
      input: action.input,
      timeoutMs,
    });
    if (result.ok) {
      replaced += 1;
    } else {
      failed += 1;
    }
  }

  return { failed, inserted, replaced, skipped };
};
