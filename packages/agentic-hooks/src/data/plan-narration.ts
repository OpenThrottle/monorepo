/**
 * Plan-output narration — the tool-neutral floor under a loop's own
 * narration.
 *
 * An interactive plan run is meant to narrate itself with
 * `append_plan_output`. When the model forgets, the plan's output stream goes
 * dark. This module decides, from the session transcript, when a hook should
 * write a short labelled chunk instead:
 *
 * - **On a task status transition** (IN_PROGRESS, COMPLETED, BLOCKED,
 *   SKIPPED) in the bound run, unless the model already called
 *   `append_plan_output` for that task since the task's previous transition.
 * - **At the end of a turn**, one summary chunk for each task the run moved
 *   that has no narration at all, from the model or from this hook.
 *
 * Hook chunks start with {@link PLAN_NARRATION_LABEL} so a reader can tell
 * them from the model's. They never reach the transcript, so what the hook
 * wrote is remembered in a small per-session state file of narration keys
 * under the telemetry directory.
 *
 * Fail-open throughout. A chunk that cannot be posted is dropped rather than
 * buffered: the transcript is the buffer, because a transition whose chunk
 * failed is not recorded as narrated, and the end-of-turn pass picks it up
 * once the server answers again.
 *
 * @public
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import type { HookFetch } from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import type {
  PlanRunToolUse,
  PlanRunTranscriptAdapter,
} from './findPlanRunBinding.ts';
import { findPlanRunBinding } from './findPlanRunBinding.ts';
import { postGraphqlMutation } from './graphql.ts';
import { resolveTelemetryDir, sanitizeSessionId } from './jsonl.ts';

/**
 * The prefix of every hook-written chunk.
 *
 * @public
 */
export const PLAN_NARRATION_LABEL = '[hook:narration]';

/** The output-stream `kind` hook chunks carry: loop bookkeeping. */
const CHUNK_KIND = 'loop';

const APPEND_OUTPUT_SUFFIX = '__append_plan_output';
const UPDATE_TASK_SUFFIX = '__update_task';
const IN_PROGRESS = 'IN_PROGRESS';
const NARRATED_STATUSES: ReadonlySet<string> = new Set([
  'BLOCKED',
  'COMPLETED',
  IN_PROGRESS,
  'SKIPPED',
]);
const STATE_DIR_BASENAME = 'plan-narration';

const APPEND_MUTATION = `
mutation AppendPlanOutputFromHook($input: AppendPlanOutputInput!) {
  appendPlanOutput(input: $input) { id }
}
`;

/**
 * A tool call with the harness's id for it, so the call that fired the hook
 * can be told apart from earlier ones.
 *
 * @public
 */
export interface NarrationToolUse extends PlanRunToolUse {
  readonly id: string | null;
}

/**
 * The binding adapter plus line timestamps and tool-call ids.
 *
 * @public
 */
export interface PlanNarrationTranscriptAdapter extends PlanRunTranscriptAdapter {
  readonly timestampMsOf: (event: unknown) => number | null;
  readonly toolUsesOf: (event: unknown) => readonly NarrationToolUse[];
}

/**
 * One chunk to append, and the key recorded once it is posted.
 *
 * @public
 */
export interface PlanNarrationChunk {
  readonly content: string;
  readonly key: string;
  readonly planId: string;
  readonly taskId: string;
}

/** What the transcript says about one task since the register. */
interface TaskHistory {
  inProgressAtMs: number | null;
  lastNarrationIndex: number;
  lastTransitionIndex: number;
  readonly statuses: string[];
}

const nonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

const newHistory = (): TaskHistory => {
  return {
    inProgressAtMs: null,
    lastNarrationIndex: -1,
    lastTransitionIndex: -1,
    statuses: [],
  };
};

/**
 * Per task id, its transitions and narration from `fromIndex` on, skipping
 * the call whose id is `skipToolUseId` (the one that fired the hook).
 */
const readTaskHistories = (
  events: readonly unknown[],
  adapter: PlanNarrationTranscriptAdapter,
  fromIndex: number,
  skipToolUseId: string | null,
): ReadonlyMap<string, TaskHistory> => {
  const histories = new Map<string, TaskHistory>();
  const historyOf = (taskId: string): TaskHistory => {
    const found = histories.get(taskId);
    if (found !== undefined) return found;
    const created = newHistory();
    histories.set(taskId, created);
    return created;
  };

  for (const [eventIndex, event] of events.entries()) {
    if (eventIndex < fromIndex) continue;
    for (const use of adapter.toolUsesOf(event)) {
      if (skipToolUseId !== null && use.id === skipToolUseId) continue;
      if (use.name.endsWith(APPEND_OUTPUT_SUFFIX)) {
        const taskId = nonEmptyString(use.input.taskId);
        if (taskId !== null) historyOf(taskId).lastNarrationIndex = eventIndex;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX)) {
        const taskId = nonEmptyString(use.input.id);
        const status = nonEmptyString(use.input.status)?.toUpperCase() ?? null;
        if (taskId === null || status === null) continue;
        const history = historyOf(taskId);
        history.lastTransitionIndex = eventIndex;
        history.statuses.push(status);
        if (status === IN_PROGRESS) {
          history.inProgressAtMs = adapter.timestampMsOf(event);
        }
      }
    }
  }
  return histories;
};

/**
 * @description A duration as `1h 4m`, `12m 30s` or `45s`.
 * @public
 */
export const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/** ` after 12m 30s` for a task leaving IN_PROGRESS at a known time, else empty. */
const elapsedSuffixOf = (
  status: string,
  startedAtMs: number | null,
  nowMs: number,
): string => {
  if (status === IN_PROGRESS || startedAtMs === null) return '';
  return ` after ${formatElapsed(nowMs - startedAtMs)}`;
};

const runKeyOf = (planId: string, planRunId: string | null): string => {
  return planRunId ?? planId;
};

const describeTask = (taskId: string, title: string | null): string => {
  return title === null ? `Task ${taskId}` : `Task "${title}" (${taskId})`;
};

const suffixOf = (branch: string | null, planRunId: string | null): string => {
  const parts = [
    branch === null ? null : `branch ${branch}`,
    planRunId === null ? null : `run ${planRunId}`,
  ].filter((part) => part !== null);
  return parts.length === 0 ? '' : ` · ${parts.join(' · ')}`;
};

/** The inputs of {@link decideTransitionNarration}. */
export interface TransitionNarrationInput {
  readonly adapter: PlanNarrationTranscriptAdapter;
  readonly events: readonly unknown[];
  readonly nowMs: number;
  readonly status: unknown;
  readonly taskId: string | null;
  readonly taskTitle: string | null;
  /** The harness id of the `update_task` call that fired the hook. */
  readonly toolUseId: string | null;
}

/**
 * @description The chunk to write for an `update_task` that just ran, or null
 * when there is nothing to say: no active run, a status that is not narrated,
 * or a model that already narrated the task since its previous transition.
 * @public
 */
export const decideTransitionNarration = ({
  adapter,
  events,
  nowMs,
  status,
  taskId,
  taskTitle,
  toolUseId,
}: TransitionNarrationInput): PlanNarrationChunk | null => {
  const upperStatus = nonEmptyString(status)?.toUpperCase() ?? null;
  if (taskId === null || upperStatus === null) return null;
  if (!NARRATED_STATUSES.has(upperStatus)) return null;

  const binding = findPlanRunBinding(events, adapter);
  if (binding.kind !== 'active' || binding.planId === null) return null;

  const history = readTaskHistories(
    events,
    adapter,
    binding.registerEventIndex,
    toolUseId,
  ).get(taskId);
  if (
    history !== undefined &&
    history.lastNarrationIndex > history.lastTransitionIndex
  ) {
    return null;
  }

  const elapsed = elapsedSuffixOf(
    upperStatus,
    history?.inProgressAtMs ?? null,
    nowMs,
  );
  const task = describeTask(taskId, taskTitle);
  const suffix = suffixOf(binding.branch, binding.planRunId);
  return {
    content: `${PLAN_NARRATION_LABEL} ${task} → ${upperStatus}${elapsed}${suffix}`,
    key: `${runKeyOf(binding.planId, binding.planRunId)}:${taskId}:${upperStatus}`,
    planId: binding.planId,
    taskId,
  };
};

/**
 * @description One summary chunk per task the active run moved in these
 * events that has no narration from the model and no recorded hook chunk.
 * Empty outside an active run.
 * @public
 */
export const decideStopNarration = ({
  adapter,
  events,
  narratedKeys,
}: {
  readonly adapter: PlanNarrationTranscriptAdapter;
  readonly events: readonly unknown[];
  readonly narratedKeys: ReadonlySet<string>;
}): readonly PlanNarrationChunk[] => {
  const binding = findPlanRunBinding(events, adapter);
  if (binding.kind !== 'active' || binding.planId === null) return [];
  const { branch, planId, planRunId } = binding;
  const runKey = runKeyOf(planId, planRunId);
  const narrated = [...narratedKeys];

  const histories = readTaskHistories(
    events,
    adapter,
    binding.registerEventIndex,
    null,
  );
  return [...histories].flatMap(([taskId, history]): PlanNarrationChunk[] => {
    const current = history.statuses.at(-1);
    if (current === undefined || history.lastNarrationIndex >= 0) return [];
    const prefix = `${runKey}:${taskId}:`;
    if (narrated.some((key) => key.startsWith(prefix))) return [];
    const moves = history.statuses.join(' → ');
    return [
      {
        content: `${PLAN_NARRATION_LABEL} Turn summary for task ${taskId}: moved ${moves} with no narration written; now ${current}${suffixOf(branch, planRunId)}`,
        key: `${prefix}SUMMARY`,
        planId,
        taskId,
      },
    ];
  });
};

/**
 * Default directory of per-session narration state.
 *
 * @public
 */
export const defaultNarrationStateDir = (): string => {
  return path.join(resolveTelemetryDir(), STATE_DIR_BASENAME);
};

const stateFileOf = (stateDir: string, sessionId: string): string => {
  return path.join(stateDir, `${sanitizeSessionId(sessionId)}.json`);
};

/**
 * The narration keys this session already posted. Any read problem is an
 * empty set.
 *
 * @public
 */
export const readNarratedKeys = (
  stateDir: string,
  sessionId: string,
): ReadonlySet<string> => {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(stateFileOf(stateDir, sessionId), 'utf8'),
    );
    if (!isRecord(parsed) || !Array.isArray(parsed.keys)) return new Set();
    return new Set(
      parsed.keys.filter((key): key is string => typeof key === 'string'),
    );
  } catch {
    return new Set();
  }
};

/**
 * Add keys to this session's narration state. A write problem is logged and
 * otherwise ignored.
 *
 * @public
 */
export const recordNarratedKeys = (
  stateDir: string,
  sessionId: string,
  keys: readonly string[],
): void => {
  if (keys.length === 0) return;
  try {
    const merged = new Set([...readNarratedKeys(stateDir, sessionId), ...keys]);
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      stateFileOf(stateDir, sessionId),
      JSON.stringify({ keys: [...merged] }),
    );
  } catch (err) {
    logHookError('plan-narration: state write failed', err);
  }
};

/**
 * The append call as the decision layer sees it: true once the chunk is
 * stored.
 *
 * @public
 */
export type PlanNarrationAppendFn = (
  chunk: PlanNarrationChunk,
) => Promise<boolean>;

/**
 * Append one chunk to a plan's output stream. Anything short of a stored
 * chunk (no endpoint, network failure, timeout, server error) is false.
 * Never throws.
 *
 * @public
 */
export const appendPlanNarration = async ({
  authToken,
  chunk,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  timeoutMs,
}: {
  readonly authToken: string;
  readonly chunk: PlanNarrationChunk;
  readonly fetchImpl?: HookFetch;
  readonly graphqlUrl: string | null;
  readonly timeoutMs: number;
}): Promise<boolean> => {
  try {
    const posted = await postGraphqlMutation({
      authToken,
      fetchImpl,
      field: 'appendPlanOutput',
      graphqlUrl,
      query: APPEND_MUTATION,
      timeoutMs,
      variables: {
        input: {
          content: chunk.content,
          kind: CHUNK_KIND,
          planId: chunk.planId,
          taskId: chunk.taskId,
        },
      },
    });
    if (!posted.ok) {
      logHookError('plan-narration: append failed', posted.reason);
    }
    return posted.ok;
  } catch (err) {
    logHookError('plan-narration: append threw', err);
    return false;
  }
};

/**
 * @description Post chunks in parallel and record the keys of those stored.
 * Returns the stored keys.
 * @public
 */
export const postPlanNarration = async ({
  append,
  chunks,
  sessionId,
  stateDir,
}: {
  readonly append: PlanNarrationAppendFn;
  readonly chunks: readonly PlanNarrationChunk[];
  readonly sessionId: string;
  readonly stateDir: string;
}): Promise<readonly string[]> => {
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      return (await append(chunk)) ? chunk.key : null;
    }),
  );
  const stored = results.filter((key) => key !== null);
  recordNarratedKeys(stateDir, sessionId, stored);
  return stored;
};
