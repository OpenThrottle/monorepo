import type { PlanRunConfigRunner } from '@openthrottle/openthrottle-plan-config';
import type { useRouteLoaderData } from 'react-router';

import type {
  PlanDetailEnqueuePlanRunMutation,
  PlanDetailSchedulePlanRunMutation,
  PlanTaskStatus,
} from '~/__generated__/graphql';
import type { loader } from '~/routes/plans.$planId._index';
import type { WorkflowRalphExecutionBackendUi } from '~/routing/plans/utils/workflow-ralph-config';

/**
 * @description Canonical UI status key — the string-literal union of the
 * generated `PlanTaskStatus` GraphQL enum (the server-side SSOT). Using the
 * template-literal form (rather than the nominal enum) keeps raw 'BACKLOG'-style
 * literals assignable across the UI while still failing to compile if the enum
 * gains or loses a member.
 */
export type PlanStatusKey = `${PlanTaskStatus}`;

/**
 * @description Human-readable label for every plan/task status. Typed as
 * `Record<PlanStatusKey, string>` so it must stay exhaustive with the SSOT enum —
 * add a status upstream and this map fails to compile until a label is provided.
 * This is the single UI label source (consumed by the badge, chip, board columns,
 * status filter, and format-status).
 */
export const planStatusValues: Record<PlanStatusKey, string> = {
  BACKLOG: 'Backlog',
  BLOCKED: 'Blocked',
  CANCELED: 'Canceled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  PROMOTED: 'Promoted',
  QUEUED: 'Queued',
  SCHEDULED: 'Scheduled',
  SKIPPED: 'Skipped',
};

/**
 * @description Minimal plan shape the run-config editor reads to gate + seed
 * saves. Structurally satisfied by the route's loader plan.
 */
export interface PlanRunConfigEditorPlan {
  readonly id: string;
  readonly jobRunHooksJson?: string | null;
  readonly runConfigJson?: string | null;
}

/**
 * @description The plan detail route's loader data, as returned (non-null) by
 * `usePlanDetailRouteData`. The loader is imported type-only, so this adds no
 * runtime import cycle.
 */
export type PlanDetailRouteData = NonNullable<
  ReturnType<typeof useRouteLoaderData<typeof loader>>
>;

/** @description Which tab the Run dialog is on: enqueue now, or fire at a later instant. */
export type PlanRunDialogMode = 'run' | 'schedule';

/**
 * @description Everything the Run dialog lets the user edit. Rebuilt from the plan's
 * `runConfigJson` each time the dialog opens, so nothing carries over between opens.
 * `iterationsText` is the raw field (this run only); backend, model and effort are
 * PLAN settings the action saves to the run config.
 */
export interface PlanRunDialogDraft {
  readonly backend: WorkflowRalphExecutionBackendUi;
  readonly effort: string;
  readonly iterationsText: string;
  readonly mode: PlanRunDialogMode;
  readonly model: string;
  /** @description Raw retry count (blank = default); OT Loop only. */
  readonly otLoopMaxRetriesText: string;
  /** @description One validation command per line; OT Loop only. Blank = repo file / Nx default. */
  readonly otLoopValidationText: string;
  /** @description Saved to the plan's run config and sent as `runner` at enqueue. */
  readonly runner: PlanRunConfigRunner;
  readonly scheduleDate: Date | undefined;
  /** @description `HH:mm`, 24-hour, in the browser's local zone. */
  readonly scheduleTime: string;
}

/**
 * @description What the Run dialog reports to its caller once the action succeeds, so the
 * caller can toast: the job id for Run now, the fire time for a scheduled run.
 */
export type PlanRunDialogSubmission =
  | {
      readonly mode: 'run';
      readonly result: PlanDetailEnqueuePlanRunMutation['enqueuePlanRun'];
    }
  | {
      readonly mode: 'schedule';
      readonly result: PlanDetailSchedulePlanRunMutation['schedulePlanRun'];
    };

/**
 * @description The runner choice and OT Loop fields of the Run dialog, as one bag the
 * dialog spreads onto its settings section.
 */
export interface PlanRunDialogRunnerSettings {
  readonly onOtLoopMaxRetriesChange: (text: string) => void;
  readonly onOtLoopValidationChange: (text: string) => void;
  readonly onRunnerChange: (runner: PlanRunConfigRunner) => void;
  /** @description Why the retry count is invalid; `undefined` when it is fine or the runner is Ralph. */
  readonly otLoopMaxRetriesError: string | undefined;
  readonly otLoopMaxRetriesText: string;
  readonly otLoopValidationText: string;
  readonly runner: PlanRunConfigRunner;
}
