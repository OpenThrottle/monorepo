import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PlanRunDialogConfirm } from '~/routing/plans/components/PlanRunDialogConfirm';
import { PlanRunDialogFooter } from '~/routing/plans/components/PlanRunDialogFooter';
import { PlanRunDialogHiddenFields } from '~/routing/plans/components/PlanRunDialogHiddenFields';
import { PlanRunDialogSchedule } from '~/routing/plans/components/PlanRunDialogSchedule';
import { PlanRunDialogSettings } from '~/routing/plans/components/PlanRunDialogSettings';
import { PlanRunDialogWorkspace } from '~/routing/plans/components/PlanRunDialogWorkspace';
import { PLAN_RUN_DIALOG_COPY } from '~/routing/plans/data/data.copy';
import { usePlanRunDialog } from '~/routing/plans/hooks/usePlanRunDialog';
import type {
  PlanRunDialogMode,
  PlanRunDialogSubmission,
} from '~/routing/plans/types';

export interface PlanRunDialogProps {
  /** @description Run branch (REQUIRED enqueue input); blank disables submit with a named reason. */
  readonly branch: string;
  readonly checkoutId: string;

  /** @description JSON `{ hooks: [...] }` for the enqueue; empty when none or invalid. */
  readonly jobRunHooksJson?: string;

  /** @description Tab the dialog opens on, re-applied every time it opens. */
  readonly mode: PlanRunDialogMode;

  /** @description The loader's deferred model discovery (`loaderData.models`). */
  readonly models: Promise<readonly ChatModelOption[]>;
  readonly onOpenChange: (open: boolean) => void;

  /** @description Fired once the run is enqueued or scheduled, just before the dialog closes. */
  readonly onSubmitted: (submission: PlanRunDialogSubmission) => void;
  readonly open: boolean;
  readonly planId: string;
  readonly planStatus?: string;

  /** @description JSON-serialized Ralph tuning from the Configuration tab (the toolbar's `ralphTuning`). */
  readonly ralphTuningJson?: string;

  /** @description Resolved repositories, only to name the checkout in the read-only summary. */
  readonly repositories?: readonly PlanRunConfigRepositoryFieldsFragment[];
  readonly repositoryId: string;

  /** @description The plan's saved run config; model, effort and iterations read from it on every open. */
  readonly runConfigJson: string | null | undefined;

  /** @description The plan's scheduled run; non-null makes submit ask to unschedule (Run now) or replace (Schedule). */
  readonly scheduledRunAt?: Date | string | null;
  readonly workflowRunBlocked?: boolean;
  readonly workflowRunBlockedReason?: string;
  readonly workingDirectory: string;
}

/**
 * @description Run now / Schedule dialog for a plan. Reads the plan's `runConfigJson` and posts
 * `runPlan` or `schedulePlanRun` to the plan detail action through a fetcher. Model and effort are
 * PLAN settings the action saves; iterations is this run only. On a scheduled plan a submit first
 * asks to unschedule or replace it. State lives in {@link usePlanRunDialog}.
 */
export const PlanRunDialog = (
  props: PlanRunDialogProps,
): React.ReactElement => {
  const {
    branch,
    checkoutId,
    jobRunHooksJson = '',
    mode,
    models,
    onOpenChange,
    onSubmitted,
    open,
    planId,
    planStatus,
    ralphTuningJson = '',
    repositories = [],
    repositoryId,
    runConfigJson,
    scheduledRunAt,
    workflowRunBlocked = false,
    workflowRunBlockedReason,
    workingDirectory,
  } = props;

  // Hooks
  const dialog = usePlanRunDialog({
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
  });
  const { blockedReason, draft, fetcher, isSubmitting } = dialog;

  // Setup
  const copy = PLAN_RUN_DIALOG_COPY;

  // Handlers
  const handleModeChange = (value: string): void => {
    return dialog.onModeChange(value === 'schedule' ? 'schedule' : 'run');
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent data-testid="PlanRunDialog">
        <fetcher.Form
          className="flex flex-col gap-4"
          method="post"
          onSubmit={dialog.onSubmit}
        >
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>

          <PlanRunDialogHiddenFields fields={dialog.fields} />

          <Tabs onValueChange={handleModeChange} value={draft.mode}>
            <TabsList>
              <TabsTrigger value="run">{copy.modeRunLabel}</TabsTrigger>
              <TabsTrigger value="schedule">
                {copy.modeScheduleLabel}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="run">
              <p className="text-muted-foreground text-sm">{copy.runSummary}</p>
            </TabsContent>
            <TabsContent value="schedule">
              <PlanRunDialogSchedule
                date={draft.scheduleDate}
                error={dialog.scheduleError}
                onDateChange={dialog.onScheduleDateChange}
                onTimeChange={dialog.onScheduleTimeChange}
                summary={dialog.scheduleSummary}
                time={draft.scheduleTime}
                timeZone={dialog.timeZone}
              />
            </TabsContent>
          </Tabs>

          <PlanRunDialogSettings
            backend={draft.backend}
            effort={draft.effort}
            iterationsError={dialog.iterationsError}
            iterationsText={draft.iterationsText}
            model={draft.model}
            models={models}
            onEffortChange={dialog.onEffortChange}
            onIterationsChange={dialog.onIterationsChange}
            onModelChange={dialog.onModelChange}
            planIterations={dialog.planIterations}
            {...dialog.runnerSettings}
          />

          <PlanRunDialogWorkspace
            branch={branch}
            checkoutId={checkoutId}
            onNavigate={() => onOpenChange(false)}
            repositories={repositories}
            workingDirectory={workingDirectory}
          />

          <PlanRunDialogFooter
            blockedReason={blockedReason}
            errorMessage={dialog.errorMessage}
            isSubmitting={isSubmitting}
            mode={draft.mode}
            onCancel={() => onOpenChange(false)}
          />
        </fetcher.Form>
        <PlanRunDialogConfirm
          mode={draft.mode}
          onConfirm={dialog.confirm.onConfirm}
          onOpenChange={dialog.confirm.onConfirmOpenChange}
          open={dialog.confirm.confirmOpen}
          scheduledFor={dialog.confirm.serverScheduledFor ?? scheduledRunAt}
        />
      </DialogContent>
    </Dialog>
  );
};
