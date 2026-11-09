/**
 * @description Pure helpers behind the Run dialog ({@link PlanRunDialog}): the draft
 * it opens with, the named reason a submit is blocked, the iterations field, and the
 * hidden form fields the plan detail action reads. Gating reuses the toolbar's
 * copy and status predicates so the dialog and the toolbar's Run button agree on
 * when and why a run cannot start.
 */
import {
  PLAN_RUN_DIALOG_COPY,
  PLAN_RUN_GATING_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';
import type {
  PlanRunDialogDraft,
  PlanRunDialogMode,
} from '~/routing/plans/types';
import { getPlanScheduleDisabledReason } from '~/routing/plans/utils/getPlanScheduleDisabledReason';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import { hydratePlanRunConfigUiState } from '~/routing/plans/utils/plan-run-config-ui';
import { seedPlanRunAgent } from '~/routing/plans/utils/plan-run-default-agent';
import { reconcilePlanRunEffort } from '~/routing/plans/utils/plan-run-model-effort';
import {
  formatOtLoopCommandsText,
  parseOtLoopCommandsText,
  resolvePlanRunRunner,
} from '~/routing/plans/utils/plan-run-ot-loop';
import {
  composeScheduleInstant,
  formatScheduleTime,
  getDefaultScheduleInstant,
} from '~/routing/plans/utils/plan-run-schedule';
import {
  getPlanIsRunning,
  getPlanIsTerminal,
} from '~/routing/plans/utils/utils.plans';
import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';

const isBlank = (value: string | null | undefined): boolean => {
  return value == null || value.trim() === '';
};

/**
 * @description Branch is a REQUIRED enqueue input; blank would fail fast at the server
 * boundary, so the toolbar and the dialog both gate on it.
 */
export const isPlanRunBranchMissing = (
  branch: string | null | undefined,
): boolean => {
  return isBlank(branch);
};

/**
 * @description Link to the plan detail's Configuration tab (the tabs sync to a search
 * param; `parsePlanDetailTab` reads it back). Relative, so it keeps the current plan.
 */
export const getPlanConfigurationTabHref = (): string => {
  return `?${PLANS_DETAIL_TAB_SEARCH_PARAM}=configuration`;
};

/**
 * @description The plan's configured iterations, read from `runConfigJson` (the default
 * when it is missing or unreadable).
 */
export const getPlanConfiguredIterations = (
  planId: string,
  runConfigJson: string | null | undefined,
): number => {
  return hydratePlanRunConfigUiState(planId, runConfigJson).workflowInput
    .iterations;
};

/**
 * @description The draft a freshly opened dialog starts from: the plan's saved
 * backend / model / effort and its configured iterations, with the Schedule tab seeded
 * to the plan's current scheduled time when it has one (Reschedule…), else to the next
 * sensible hour. Nothing from an earlier open survives.
 */
export const createPlanRunDialogDraft = (input: {
  /** @description The user's valid default agent; seeds a plan whose agent is unset (D3). */
  readonly defaultAgent: DefaultAgentDraft | null;
  readonly mode: PlanRunDialogMode;
  readonly now: Date;
  readonly planId: string;
  readonly runConfigJson: string | null | undefined;
  readonly scheduledRunAt: Date | string | null | undefined;
}): PlanRunDialogDraft => {
  const { defaultAgent, mode, now, planId, runConfigJson, scheduledRunAt } =
    input;
  const hydrated = hydratePlanRunConfigUiState(planId, runConfigJson);
  const { otLoop, runner } = hydrated;
  const workflowInput = seedPlanRunAgent(
    hydrated.workflowInput,
    defaultAgent,
  );
  const scheduledInstant =
    scheduledRunAt == null ? undefined : new Date(scheduledRunAt);
  const hasScheduledInstant =
    scheduledInstant !== undefined && !Number.isNaN(scheduledInstant.getTime());
  const defaultInstant = hasScheduledInstant
    ? scheduledInstant
    : getDefaultScheduleInstant(now);

  return {
    backend: workflowInput.executionBackend,
    effort: reconcilePlanRunEffort(
      workflowInput.executionBackend,
      workflowInput.effort,
    ),
    iterationsText: String(workflowInput.iterations),
    mode,
    model: workflowInput.model,
    otLoopMaxRetriesText:
      otLoop?.maxRetries === undefined ? '' : String(otLoop.maxRetries),
    otLoopValidationText: formatOtLoopCommandsText(otLoop?.validationCommands),
    runner: resolvePlanRunRunner(runner),
    scheduleDate: defaultInstant,
    scheduleTime: formatScheduleTime(defaultInstant),
  };
};

/**
 * @description The positive whole number in the iterations field, `undefined` when it is
 * blank (the plan's configured value applies) and `null` when it is not a valid count.
 */
export const parsePlanRunDialogIterations = (
  text: string,
): number | null | undefined => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return undefined;
  }

  return /^\d+$/.test(trimmed) && Number(trimmed) >= 1 ? Number(trimmed) : null;
};

export interface PlanRunDialogGatingInput {
  readonly branch: string;
  readonly mode: PlanRunDialogMode;
  readonly planStatus: string | undefined;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason: string | undefined;
}

/**
 * @description The first named reason the dialog cannot submit, or `null`. Same order as
 * the toolbar's Run tooltip: terminal, running (Run now only), the schedule gate (Schedule
 * only — BLOCKED or active), workflow options invalid, then the blank branch. A run with no checkout,
 * repository or working directory (monorepo root) is allowed, as the one-click Run allows it.
 */
export const getPlanRunDialogBlockedReason = (
  input: PlanRunDialogGatingInput,
): string | null => {
  const {
    branch,
    mode,
    planStatus,
    workflowRunBlocked,
    workflowRunBlockedReason,
  } = input;

  if (getPlanIsTerminal(planStatus)) {
    return PLAN_TOOLBAR_COPY.runTerminalTooltip;
  }

  if (mode === 'run' && getPlanIsRunning(planStatus)) {
    return PLAN_TOOLBAR_COPY.runRunningTooltip;
  }

  // Scheduling has its own gate (D2): BLOCKED and active plans are rejected by the server.
  const scheduleReason =
    mode === 'schedule' ? getPlanScheduleDisabledReason(planStatus) : null;
  if (scheduleReason !== null) {
    return scheduleReason;
  }

  if (workflowRunBlocked) {
    return (
      workflowRunBlockedReason ??
      'Fix workflow run options in Configuration (aligned with workflow-ralph argv).'
    );
  }

  if (isPlanRunBranchMissing(branch)) {
    return PLAN_RUN_GATING_COPY.branchRequired;
  }

  return null;
};

export interface PlanRunDialogFieldsInput {
  readonly branch: string;
  readonly checkoutId: string;
  readonly draft: PlanRunDialogDraft;
  readonly iterations: number | null | undefined;
  readonly jobRunHooksJson: string;
  readonly ralphTuningJson: string;
  readonly repositoryId: string;
  readonly scheduledFor: Date | undefined;
  readonly workingDirectory: string;
}

/**
 * @description The hidden form fields the plan detail action reads, keys in alphabetical
 * order. Blank values are left out, as the toolbar's one-click Run form does. `backend` +
 * `model` always travel together; `effort` is omitted when unset; `iterations` is only the
 * per-run override and Ralph-only (dropped for OT Loop); the `otLoop*` fields travel only for
 * OT Loop, and `runner` always travels; `scheduledFor` (an ISO instant) exists on the Schedule tab alone.
 */
export const buildPlanRunDialogFields = (
  input: PlanRunDialogFieldsInput,
): Readonly<Record<string, string>> => {
  const {
    branch,
    checkoutId,
    draft,
    iterations,
    jobRunHooksJson,
    ralphTuningJson,
    repositoryId,
    scheduledFor,
    workingDirectory,
  } = input;
  const isOtLoop = draft.runner === 'ot-loop';
  const entries: readonly (readonly [string, string | undefined])[] = [
    ['backend', draft.backend],
    ['branch', branch],
    ['checkoutId', checkoutId],
    ['effort', draft.effort],
    ['intent', draft.mode === 'schedule' ? 'schedulePlanRun' : 'runPlan'],
    [
      'iterations',
      iterations == null || isOtLoop ? undefined : String(iterations),
    ],
    ['jobRunHooksJson', jobRunHooksJson],
    ['model', draft.model],
    ['otLoopMaxRetries', isOtLoop ? draft.otLoopMaxRetriesText : undefined],
    [
      'otLoopValidationCommands',
      isOtLoop
        ? parseOtLoopCommandsText(draft.otLoopValidationText).join('\n')
        : undefined,
    ],
    ['ralphTuning', ralphTuningJson],
    ['repositoryId', repositoryId],
    ['runner', draft.runner],
    [
      'scheduledFor',
      draft.mode === 'schedule' ? scheduledFor?.toISOString() : undefined,
    ],
    ['workingDirectory', workingDirectory],
  ];

  return Object.fromEntries(
    entries.filter(
      (entry): entry is readonly [string, string] =>
        entry[1] !== undefined && entry[1].trim() !== '',
    ),
  );
};

/** @description The Run dialog's schedule instant for a draft, in the browser's local zone. */
export const getPlanRunDialogInstant = (
  draft: PlanRunDialogDraft,
): Date | undefined => {
  return composeScheduleInstant(draft.scheduleDate, draft.scheduleTime);
};

/** @description Submit-button copy per mode and busy state. */
export const getPlanRunDialogSubmitLabel = (
  mode: PlanRunDialogMode,
  submitting: boolean,
): string => {
  if (mode === 'schedule') {
    return submitting
      ? PLAN_RUN_DIALOG_COPY.scheduleSubmittingLabel
      : PLAN_RUN_DIALOG_COPY.scheduleSubmitLabel;
  }

  return submitting
    ? PLAN_RUN_DIALOG_COPY.runSubmittingLabel
    : PLAN_RUN_DIALOG_COPY.runSubmitLabel;
};
