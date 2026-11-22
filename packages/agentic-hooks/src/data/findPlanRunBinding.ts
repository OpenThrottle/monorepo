/**
 * Plan-run binding — the tool-neutral answer to "is this session in a plan
 * run, for which plan, and which task is IN_PROGRESS", derived from the
 * session transcript.
 *
 * A session is bound to a run between its own `register_plan_run` and the
 * next `settle_plan_run`. Every `update_task` with a status in that window
 * moves the task state. Tools are matched by name suffix, because the MCP
 * prefix (`mcp__openthrottle-mcp__`, `mcp__ot__`, …) varies by host.
 *
 * The transcript's shape is the harness's business, so the reading goes
 * through a {@link PlanRunTranscriptAdapter}: each tool adapter supplies how to
 * list one line's tool calls and how to find the run id in a register result.
 * The decision itself is pure and does no I/O; reading a bounded transcript
 * tail (and treating a missing, huge or corrupt one as no events) stays with
 * the caller.
 *
 * @public
 */

const REGISTER_RUN_SUFFIX = '__register_plan_run';
const SETTLE_RUN_SUFFIX = '__settle_plan_run';
const UPDATE_TASK_SUFFIX = '__update_task';
const IN_PROGRESS = 'IN_PROGRESS';

/**
 * One tool call as the binding needs to see it.
 *
 * @public
 */
export interface PlanRunToolUse {
  readonly input: Readonly<Record<string, unknown>>;
  readonly name: string;
}

/**
 * How one harness's transcript is read: the tool calls on a line, and the run
 * id recorded in the events from a `register_plan_run` onward.
 *
 * @public
 */
export interface PlanRunTranscriptAdapter {
  readonly planRunIdOf: (events: readonly unknown[]) => string | null;
  readonly toolUsesOf: (event: unknown) => readonly PlanRunToolUse[];
}

/**
 * The state of the most recent run the session registered.
 *
 * - `branch` — the register call's `branch` input, null when it gave none.
 * - `currentTaskId` — the id of the latest `update_task` to IN_PROGRESS,
 *   cleared when that same task moves to another status.
 * - `inProgressTaskIds` — every task whose latest status is IN_PROGRESS,
 *   oldest flip first. More than one means a status flip was skipped.
 * - `lastStatusByTaskId` — the latest status (upper-cased) per task id.
 * - `latestStatus` — the latest status of any `update_task`, with or without
 *   an id: the stand-in for "the current task" when ids are absent.
 * - `planId` — the register call's `planId` input, null when it gave none.
 * - `planRunId` — the run id the adapter found from the register onward.
 * - `registerEventIndex` — the index of the register line in the events.
 *
 * @public
 */
export interface PlanRunBindingState {
  readonly branch: string | null;
  readonly currentTaskId: string | null;
  readonly inProgressTaskIds: readonly string[];
  readonly lastStatusByTaskId: ReadonlyMap<string, string>;
  readonly latestStatus: string | null;
  readonly planId: string | null;
  readonly planRunId: string | null;
  readonly registerEventIndex: number;
}

/**
 * A run registered and not yet settled.
 *
 * @public
 */
export interface ActivePlanRunBinding extends PlanRunBindingState {
  readonly kind: 'active';
}

/**
 * The last run the session registered, already settled. Its task state is the
 * state at the settle.
 *
 * @public
 */
export interface SettledPlanRunBinding extends PlanRunBindingState {
  readonly kind: 'settled';
}

/**
 * No run was registered in the events read.
 *
 * @public
 */
export interface NoPlanRunBinding {
  readonly kind: 'none';
}

/** @public */
export type PlanRunBinding =
  ActivePlanRunBinding | NoPlanRunBinding | SettledPlanRunBinding;

interface MutableRunState {
  readonly branch: string | null;
  currentTaskId: string | null;
  latestStatus: string | null;
  readonly planId: string | null;
  readonly registerEventIndex: number;
  readonly statusByTaskId: Map<string, string>;
}

const nonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

const applyTaskUpdate = (
  run: MutableRunState,
  input: Readonly<Record<string, unknown>>,
): void => {
  const rawStatus = nonEmptyString(input.status);
  if (rawStatus === null) return;
  const status = rawStatus.toUpperCase();
  run.latestStatus = status;

  const id = nonEmptyString(input.id);
  if (id === null) return;
  // Delete first so the map's insertion order is the order of latest flips.
  run.statusByTaskId.delete(id);
  run.statusByTaskId.set(id, status);
  if (status === IN_PROGRESS) {
    run.currentTaskId = id;
  } else if (id === run.currentTaskId) {
    run.currentTaskId = null;
  }
};

const toState = (
  run: MutableRunState,
  events: readonly unknown[],
  adapter: PlanRunTranscriptAdapter,
): PlanRunBindingState => {
  const inProgressTaskIds = [...run.statusByTaskId]
    .filter(([, status]) => status === IN_PROGRESS)
    .map(([id]) => id);
  return {
    branch: run.branch,
    currentTaskId: run.currentTaskId,
    inProgressTaskIds,
    lastStatusByTaskId: new Map(run.statusByTaskId),
    latestStatus: run.latestStatus,
    planId: run.planId,
    planRunId: adapter.planRunIdOf(events.slice(run.registerEventIndex)),
    registerEventIndex: run.registerEventIndex,
  };
};

/**
 * @description The session's plan-run binding in parsed transcript events: the
 * latest `register_plan_run` and the `update_task` calls after it, `active`
 * until a `settle_plan_run` follows, `settled` after one. A new register
 * starts a fresh state. Events the adapter cannot read contribute nothing, so
 * no input makes this throw.
 * @public
 */
export const findPlanRunBinding = (
  events: readonly unknown[],
  adapter: PlanRunTranscriptAdapter,
): PlanRunBinding => {
  let run: MutableRunState | null = null;
  let isSettled = false;

  for (const [eventIndex, event] of events.entries()) {
    for (const use of adapter.toolUsesOf(event)) {
      if (use.name.endsWith(REGISTER_RUN_SUFFIX)) {
        run = {
          branch: nonEmptyString(use.input.branch),
          currentTaskId: null,
          latestStatus: null,
          planId: nonEmptyString(use.input.planId),
          registerEventIndex: eventIndex,
          statusByTaskId: new Map(),
        };
        isSettled = false;
      } else if (use.name.endsWith(SETTLE_RUN_SUFFIX)) {
        isSettled = run !== null;
      } else if (use.name.endsWith(UPDATE_TASK_SUFFIX)) {
        if (run !== null && !isSettled) applyTaskUpdate(run, use.input);
      }
    }
  }

  if (run === null) return { kind: 'none' };
  const state = toState(run, events, adapter);
  return isSettled
    ? { ...state, kind: 'settled' }
    : { ...state, kind: 'active' };
};
