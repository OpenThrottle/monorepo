/**
 * @description All non-presentational state behind {@link PlanRunDialog}: the draft
 * (mode, model, effort, iterations, schedule) rebuilt from the plan's `runConfigJson`
 * each time the dialog opens, the named reason a submit is blocked, the hidden form
 * fields, and the action fetcher. This dialog reads the PLAN's saved run config, not
 * the chat toolbar atom. Extracted per component-primitive-shape R7.
 */
import { MAX_PLAN_RUN_OT_LOOP_RETRIES } from '@openthrottle/openthrottle-plan-config';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import { PLAN_RUN_DIALOG_CLOCK_TICK_MS } from '~/routing/plans/config/defaults';
import {
  PLAN_RUN_DIALOG_COPY,
  PLAN_RUN_RUNNER_COPY,
} from '~/routing/plans/data/data.copy';
import type { UsePlanRunDialogConfirmResult } from '~/routing/plans/hooks/usePlanRunDialogConfirm';
import { usePlanRunDialogConfirm } from '~/routing/plans/hooks/usePlanRunDialogConfirm';
import type {
  PlanRunDialogDraft,
  PlanRunDialogMode,
  PlanRunDialogRunnerSettings,
  PlanRunDialogSubmission,
} from '~/routing/plans/types';
import { getPlanRunDialogScheduleFeedback } from '~/routing/plans/utils/getPlanRunDialogScheduleFeedback';
import {
  buildPlanRunDialogFields,
  createPlanRunDialogDraft,
  getPlanConfiguredIterations,
  getPlanRunDialogBlockedReason,
  getPlanRunDialogInstant,
  parsePlanRunDialogIterations,
} from '~/routing/plans/utils/plan-run-dialog';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import { reconcilePlanRunEffort } from '~/routing/plans/utils/plan-run-model-effort';
import { parseOtLoopMaxRetriesText } from '~/routing/plans/utils/plan-run-ot-loop';
import {
  getLocalTimeZone,
  getScheduleInstantError,
} from '~/routing/plans/utils/plan-run-schedule';
import { readActionError } from '~/routing/plans/utils/readActionError';

export interface UsePlanRunDialogOptions {
  /** @description Run branch (REQUIRED enqueue input); blank blocks submit. */
  readonly branch: string;
  readonly checkoutId: string;
  readonly jobRunHooksJson: string;
  /** @description Tab the dialog opens on; re-applied each time it opens. */
  readonly mode: PlanRunDialogMode;
  readonly onOpenChange: (open: boolean) => void;
  /** @description Fired once the action succeeds, just before the dialog closes. */
  readonly onSubmitted: (submission: PlanRunDialogSubmission) => void;
  readonly open: boolean;
  readonly planId: string;
  readonly planStatus: string | undefined;
  readonly ralphTuningJson: string;
  readonly repositoryId: string;
  /** @description The plan's saved run config; the draft resets from it on every open. */
  readonly runConfigJson: string | null | undefined;
  /** @description The plan's scheduled run; non-null makes a submit ask to unschedule/replace first. */
  readonly scheduledRunAt: Date | string | null | undefined;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason: string | undefined;
  readonly workingDirectory: string;
}

export interface UsePlanRunDialogResult {
  /** @description Named reason submit is disabled, or `null` when it can go. */
  readonly blockedReason: string | null;
  /** @description State and handlers of the unschedule-first confirm. */
  readonly confirm: UsePlanRunDialogConfirmResult;
  readonly draft: PlanRunDialogDraft;
  /** @description The action's error for the current mode, once a submit was attempted. */
  readonly errorMessage: string | undefined;
  readonly fetcher: ReturnType<typeof useFetcher<typeof action>>;
  /** @description Hidden form fields for the action, blanks omitted. */
  readonly fields: Readonly<Record<string, string>>;
  readonly isSubmitting: boolean;
  readonly iterationsError: string | undefined;
  readonly onEffortChange: (effort: string) => void;
  readonly onIterationsChange: (iterationsText: string) => void;
  readonly onModeChange: (mode: PlanRunDialogMode) => void;
  readonly onModelChange: (selection: PlanRunModelSelection) => void;
  readonly onScheduleDateChange: (date: Date | undefined) => void;
  readonly onScheduleTimeChange: (time: string) => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** @description The plan's configured iterations, for the "resets to" hint. */
  readonly planIterations: number;
  /** @description The runner choice and OT Loop fields, spread onto the settings section. */
  readonly runnerSettings: PlanRunDialogRunnerSettings;
  readonly scheduleError: string | null;
  /** @description "fires 3:00 PM PST, in about 4 hours"; `undefined` until a future instant is picked. */
  readonly scheduleSummary: string | undefined;
  readonly timeZone: string;
}

export const usePlanRunDialog = (
  options: UsePlanRunDialogOptions,
): UsePlanRunDialogResult => {
  const {
    branch,
    checkoutId,
    jobRunHooksJson,
    mode,
    onOpenChange,
    onSubmitted,
    open,
    planId,
    planStatus,
    ralphTuningJson,
    repositoryId,
    runConfigJson,
    scheduledRunAt,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  } = options;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const [now, setNow] = React.useState(() => new Date());
  const [draft, setDraft] = React.useState(() =>
    createPlanRunDialogDraft({
      mode,
      now,
      planId,
      runConfigJson,
      scheduledRunAt,
    }),
  );
  const [attempted, setAttempted] = React.useState(false);
  const wasBusy = React.useRef(false);

  // Setup
  const isSubmitting = fetcher.state !== 'idle';
  const instant = getPlanRunDialogInstant(draft);
  const iterations = parsePlanRunDialogIterations(draft.iterationsText);
  // Iterations is Ralph-only and retries are OT Loop-only; the hidden one never blocks.
  const isOtLoop = draft.runner === 'ot-loop';
  const isIterationsInvalid = iterations === null && !isOtLoop;
  const iterationsError = isIterationsInvalid
    ? PLAN_RUN_DIALOG_COPY.iterationsInvalid
    : undefined;
  const retries = parseOtLoopMaxRetriesText(draft.otLoopMaxRetriesText);
  const isRetriesInvalid = isOtLoop && retries === null;
  const otLoopMaxRetriesError = isRetriesInvalid
    ? PLAN_RUN_RUNNER_COPY.maxRetriesInvalid(MAX_PLAN_RUN_OT_LOOP_RETRIES)
    : undefined;
  const isScheduleMode = draft.mode === 'schedule';
  const { scheduleError, scheduleSummary } = getPlanRunDialogScheduleFeedback({
    instant,
    isScheduleMode,
    now,
  });
  const blockedReason =
    getPlanRunDialogBlockedReason({
      branch,
      mode: draft.mode,
      planStatus,
      workflowRunBlocked,
      workflowRunBlockedReason,
    }) ??
    iterationsError ??
    otLoopMaxRetriesError ??
    scheduleError;
  const fields = buildPlanRunDialogFields({
    branch,
    checkoutId,
    draft,
    iterations,
    jobRunHooksJson,
    ralphTuningJson,
    repositoryId,
    scheduledFor: instant,
    workingDirectory,
  });

  const confirm = usePlanRunDialogConfirm({
    fetcher,
    fields,
    mode: draft.mode,
    open,
    scheduledRunAt,
  });
  const data = fetcher.data;
  const runError =
    data != null && 'runPlanError' in data ? data.runPlanError : undefined;
  const scheduleActionError = readActionError(data, 'schedulePlanRunError');
  const modeError = isScheduleMode ? scheduleActionError : runError;
  const errorMessage = attempted ? modeError : undefined;

  // Handlers
  const patchDraft = (patch: Partial<PlanRunDialogDraft>): void => {
    return setDraft((previous) => ({ ...previous, ...patch }));
  };

  const onModelChange = (selection: PlanRunModelSelection): void => {
    return setDraft((previous) => ({
      ...previous,
      backend: selection.backend,
      // Drop an effort the new runner would ignore or clamp.
      effort: reconcilePlanRunEffort(selection.backend, previous.effort),
      model: selection.model,
    }));
  };

  const onConfirm = (): void => {
    setAttempted(true);
    confirm.onConfirm();
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    // The clock moved since the last render: re-check against it so a schedule
    // that slipped into the past never posts. The server remains the real gate.
    const current = new Date();
    setNow(current);

    const stale =
      draft.mode === 'schedule' &&
      getScheduleInstantError(instant, current) !== null;

    if (blockedReason !== null || stale || isSubmitting) {
      event.preventDefault();

      return;
    }

    // A scheduled plan asks before anything posts; "yes" posts via the confirm hook.
    if (confirm.requestConfirm()) {
      event.preventDefault();

      return;
    }

    setAttempted(true);
  };

  // Markup

  // Life Cycle
  // Every open starts from the plan, never from the previous open's edits.
  React.useEffect(() => {
    if (!open) {
      return;
    }

    const current = new Date();
    setNow(current);
    setDraft(
      createPlanRunDialogDraft({
        mode,
        now: current,
        planId,
        runConfigJson,
        scheduledRunAt,
      }),
    );
    setAttempted(false);

    // 🪝 Only the open transition resets: a revalidation that rewrites the plan
    // while the dialog is up must not clobber what the user is editing.
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    const id = window.setInterval(
      () => setNow(new Date()),
      PLAN_RUN_DIALOG_CLOCK_TICK_MS,
    );

    return () => window.clearInterval(id);
  }, [open]);

  // Report success once, on the busy -> idle edge, then close.
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (wasBusy.current && !busy && data != null) {
      if ('runPlan' in data && data.runPlan != null) {
        onSubmitted({ mode: 'run', result: data.runPlan });
        onOpenChange(false);
      } else if ('schedulePlanRun' in data && data.schedulePlanRun != null) {
        onSubmitted({ mode: 'schedule', result: data.schedulePlanRun });
        onOpenChange(false);
      }
    }

    wasBusy.current = busy;
  }, [fetcher.state, data]);

  // 🔌 Short Circuit

  return {
    blockedReason,
    confirm: { ...confirm, onConfirm },
    draft,
    errorMessage,
    fetcher,
    fields,
    isSubmitting,
    iterationsError,
    onEffortChange: (effort) => patchDraft({ effort }),
    onIterationsChange: (iterationsText) => patchDraft({ iterationsText }),
    onModeChange: (nextMode) => patchDraft({ mode: nextMode }),
    onModelChange,
    onScheduleDateChange: (scheduleDate) => patchDraft({ scheduleDate }),
    onScheduleTimeChange: (scheduleTime) => patchDraft({ scheduleTime }),
    onSubmit,
    planIterations: getPlanConfiguredIterations(planId, runConfigJson),
    runnerSettings: {
      onOtLoopMaxRetriesChange: (otLoopMaxRetriesText) =>
        patchDraft({ otLoopMaxRetriesText }),
      onOtLoopValidationChange: (otLoopValidationText) =>
        patchDraft({ otLoopValidationText }),
      onRunnerChange: (runner) => patchDraft({ runner }),
      otLoopMaxRetriesError,
      otLoopMaxRetriesText: draft.otLoopMaxRetriesText,
      otLoopValidationText: draft.otLoopValidationText,
      runner: draft.runner,
    },
    scheduleError,
    scheduleSummary,
    timeZone: getLocalTimeZone(),
  };
};
