/**
 * @description Picks the runs behind the plan "Runs" card's Upcoming and Latest run sections
 * ({@link PlanWorkflowRunUpcoming}, {@link PlanWorkflowRunLatest}).
 */

import { parseDate } from '~/global/utils/dates';
import type { PlanRunMetaField } from '~/routing/plans/data/data.plan-run-history';
import { PLAN_RUN_META_FIELDS } from '~/routing/plans/data/data.plan-run-history';
import {
  readPlanRunModel,
  readPlanRunSnapshotEffort,
  readPlanRunSnapshotWorkspacePath,
} from '~/routing/plans/utils/plan-run-config-snapshot-ui';
import { formatWorkflowRalphExecutionBackendLabel } from '~/routing/plans/utils/workflow-ralph-config';

/** The slice of a `planRunsByPlanId` row these selectors read. */
interface SectionRun {
  readonly createdAt: string;
  readonly id: string;
  readonly scheduledFor?: string | null;
  readonly status: string;
}

/** A SCHEDULED run present in the fetched history. */
export interface UpcomingRunItem<TRun extends SectionRun> {
  readonly id: string;
  readonly kind: 'run';
  readonly run: TRun;
  readonly scheduledFor: string | null;
}

/**
 * `plan.scheduledRunId` when that run is outside the fetched history window: only its id and fire
 * time are known.
 */
export interface UpcomingBackstopItem {
  readonly id: string;
  readonly kind: 'backstop';
  readonly scheduledFor: string | null;
}

export type UpcomingItem<TRun extends SectionRun> =
  UpcomingBackstopItem | UpcomingRunItem<TRun>;

export interface PlanScheduledRunRef {
  /** `plan.scheduledRunAt`. */
  readonly scheduledRunAt: string | null;
  /** `plan.scheduledRunId`. */
  readonly scheduledRunId: string | null;
}

const ACTIVE_RUN_STATUSES: ReadonlySet<string> = new Set([
  'IN_PROGRESS',
  'QUEUED',
]);

/** Epoch ms for sorting; unparseable times sort as +Infinity (last). */
const toSortTime = (value: string | null | undefined): number =>
  parseDate(value)?.getTime() ?? Number.POSITIVE_INFINITY;

/**
 * @description SCHEDULED runs, soonest first (an unparseable `scheduledFor` sorts last), plus a
 * backstop item for `plan.scheduledRunId` when that run is not in the list.
 */
export const selectUpcomingRuns = <TRun extends SectionRun>(
  runs: readonly TRun[],
  plan: PlanScheduledRunRef,
): UpcomingItem<TRun>[] => {
  const items: UpcomingItem<TRun>[] = runs
    .filter((run) => run.status === 'SCHEDULED')
    .map((run): UpcomingRunItem<TRun> => ({
      id: run.id,
      kind: 'run',
      run,
      scheduledFor: run.scheduledFor ?? null,
    }))
    // `filter` already returned a fresh array, so sorting it in place is safe.
    .sort((a, b) => toSortTime(a.scheduledFor) - toSortTime(b.scheduledFor));

  const { scheduledRunAt, scheduledRunId } = plan;
  if (
    scheduledRunId !== null &&
    !items.some((item) => item.id === scheduledRunId)
  ) {
    items.push({
      id: scheduledRunId,
      kind: 'backstop',
      scheduledFor: scheduledRunAt,
    });
  }

  return items;
};

/**
 * @description The rows of the Run history table: every run that is not SCHEDULED (those belong
 * to Upcoming; MISSED and SUPERSEDED stay, they are history), newest `createdAt` first. An
 * unparseable `createdAt` sorts last. Returns a new array.
 */
export const selectHistoryRuns = <TRun extends SectionRun>(
  runs: readonly TRun[],
): TRun[] =>
  runs
    .filter((run) => run.status !== 'SCHEDULED')
    // `filter` already returned a fresh array, so sorting it in place is safe.
    .sort(
      (a, b) =>
        (parseDate(b.createdAt)?.getTime() ?? 0) -
        (parseDate(a.createdAt)?.getTime() ?? 0),
    );

/**
 * @description The run Latest run shows: the newest QUEUED or IN_PROGRESS run when one exists,
 * otherwise the newest run that is not SCHEDULED; null when every run is SCHEDULED (or none
 * exist).
 */
export const selectLatestRun = <TRun extends SectionRun>(
  runs: readonly TRun[],
): TRun | null => {
  const newestFirst = selectHistoryRuns(runs);

  return (
    newestFirst.find((run) => ACTIVE_RUN_STATUSES.has(run.status)) ??
    newestFirst[0] ??
    null
  );
};

export interface PlanRunMetaItem {
  readonly field: PlanRunMetaField;
  readonly value: string;
}

interface MetaRun {
  readonly executionBackend?: string | null;
  readonly model?: string | null;
  readonly runConfigSnapshotJson?: string | null;
}

/**
 * @description The "model · effort · backend · workspace" line for a run, in that order, omitting
 * whatever the run did not record. `fields` picks which of the four to include; the output order
 * is fixed here, not taken from `fields`.
 */
export const buildPlanRunMetaItems = (
  run: MetaRun,
  fields: readonly PlanRunMetaField[],
): PlanRunMetaItem[] => {
  const backend =
    run.executionBackend == null || run.executionBackend === ''
      ? null
      : formatWorkflowRalphExecutionBackendLabel(run.executionBackend);
  const values: Record<PlanRunMetaField, string | null> = {
    backend,
    effort: readPlanRunSnapshotEffort(run.runConfigSnapshotJson),
    model: readPlanRunModel(run),
    workspace: readPlanRunSnapshotWorkspacePath(run.runConfigSnapshotJson),
  };
  const order: readonly PlanRunMetaField[] = [
    PLAN_RUN_META_FIELDS.model,
    PLAN_RUN_META_FIELDS.effort,
    PLAN_RUN_META_FIELDS.backend,
    PLAN_RUN_META_FIELDS.workspace,
  ];

  return order.flatMap((field) => {
    const value = values[field];
    return fields.includes(field) && value !== null ? [{ field, value }] : [];
  });
};

/** @description True while a run is QUEUED or IN_PROGRESS, the only time a heartbeat line means anything. */
export const isActivePlanRunStatus = (status: string): boolean =>
  ACTIVE_RUN_STATUSES.has(status);
