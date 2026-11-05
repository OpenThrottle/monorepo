import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Gauge } from 'lucide-react';
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import type { action } from '~/routes/plans.$planId._index';
import { PlanRunCancelScheduledDialog } from '~/routing/plans/components/PlanRunCancelScheduledDialog';
import { PlanRunDialog } from '~/routing/plans/components/PlanRunDialog';
import { PlanToolbarActiveRunControl } from '~/routing/plans/components/PlanToolbarActiveRunControl';
import { PlanToolbarRunSplitButton } from '~/routing/plans/components/PlanToolbarRunSplitButton';
import { usePlanToolbarRunDialog } from '~/routing/plans/hooks/usePlanToolbarRunDialog';
import { getEvaluateRulesTooltip } from '~/routing/plans/utils/evaluate-rules-tooltip';

export interface PlanToolbarRunActionsProps {
  readonly branch?: string;
  readonly checkoutId?: string;
  readonly fetcherEvaluateRules: ReturnType<typeof useFetcher<typeof action>>;
  readonly fetcherRunPlan: ReturnType<typeof useFetcher<typeof action>>;
  readonly isRunning: boolean;
  readonly isTerminal: boolean;
  readonly jobRunHooksJson: string;
  /** @description The loader's deferred model discovery, for the Run dialog's model picker. */
  readonly models: Promise<readonly ChatModelOption[]>;
  /**
   * `undefined` while the deferred run history is still loading. The Stale badge
   * is withheld then — "not stale" is a claim we cannot make yet — but Kill still
   * renders, because an operator mid-run needs it and hiding a control is worse
   * than briefly offering one that may turn out to be a no-op.
   */
  readonly newestRunIsStale: boolean | undefined;
  /**
   * Id of the newest run when it is an interactive (non-heartbeating) run still
   * IN_PROGRESS; the Settle escape hatch renders for it. `undefined` while run
   * history is loading, `null` when the newest run is not one of these.
   */
  readonly newestUnsupervisedUnsettledRunId: string | null | undefined;
  readonly planId: string;
  readonly planStatus?: string;
  readonly planTitle: string;
  readonly ralphTuningJson: string;
  /** @description Deferred repositories; the Run dialog names the checkout from them. */
  readonly repositories?: Promise<
    readonly PlanRunConfigRepositoryFieldsFragment[]
  >;
  readonly repositoryId?: string;
  /** @description The plan's saved run config the Run dialog seeds model, effort and iterations from. */
  readonly runConfigJson: string | null | undefined;
  /** @description The soonest SCHEDULED run's fire time; non-null gates every run-now path. */
  readonly scheduledRunAt?: Date | string | null;
  /** @description Id of that same run; when set the caret menu offers Cancel scheduled run. */
  readonly scheduledRunId?: string | null;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason?: string;
  readonly workingDirectory?: string;
}

/**
 * @description The {@link PlanToolbar} primary action group: the Run split button
 * (one-click enqueue plus a caret for Run with options / Schedule), the Evaluate
 * rules form, the active-run control (Kill / Stale / Settle) and the
 * {@link PlanRunDialog} the caret opens. Extracted from the toolbar per
 * component-primitive-shape R6.
 */
export const PlanToolbarRunActions = (
  props: PlanToolbarRunActionsProps,
): React.ReactElement => {
  const {
    branch,
    checkoutId,
    fetcherEvaluateRules,
    fetcherRunPlan,
    isRunning,
    isTerminal,
    jobRunHooksJson,
    models,
    newestRunIsStale,
    newestUnsupervisedUnsettledRunId,
    planId,
    planStatus,
    planTitle,
    ralphTuningJson,
    repositories,
    repositoryId,
    runConfigJson,
    scheduledRunAt,
    scheduledRunId,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  } = props;

  // Hooks
  const runDialog = usePlanToolbarRunDialog({ repositories, workingDirectory });
  const [cancelOpen, setCancelOpen] = React.useState(false);

  // Setup
  const isEvaluating = fetcherEvaluateRules.state !== 'idle';
  const evaluateLabel = isEvaluating ? 'Evaluating…' : 'Evaluate rules';

  // Handlers
  const onOpenCancelScheduled = (): void => {
    return setCancelOpen(true);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <PlanToolbarRunSplitButton
        branch={branch}
        checkoutId={checkoutId}
        fetcherRunPlan={fetcherRunPlan}
        isRunning={isRunning}
        isTerminal={isTerminal}
        jobRunHooksJson={jobRunHooksJson}
        onOpenCancelScheduled={onOpenCancelScheduled}
        onOpenDialog={runDialog.onOpenDialog}
        planStatus={planStatus}
        ralphTuningJson={ralphTuningJson}
        repositoryId={repositoryId}
        scheduledRunAt={scheduledRunAt}
        scheduledRunId={scheduledRunId}
        workflowRunBlocked={workflowRunBlocked}
        workflowRunBlockedReason={workflowRunBlockedReason}
        workingDirectory={workingDirectory}
      />

      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <fetcherEvaluateRules.Form method="post">
            <Input name="intent" type="hidden" value="evaluatePlanRules" />
            <Input name="planId" type="hidden" value={planId} />
            <Button
              disabled={isEvaluating || isRunning || isTerminal}
              size="xs"
              type="submit"
              variant="ghost"
            >
              <Gauge />
              {evaluateLabel}
            </Button>
          </fetcherEvaluateRules.Form>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          {getEvaluateRulesTooltip({ isRunning, isTerminal })}
        </TooltipContent>
      </Tooltip>

      <PlanToolbarActiveRunControl
        newestRunIsStale={newestRunIsStale}
        newestUnsupervisedUnsettledRunId={newestUnsupervisedUnsettledRunId}
        planId={planId}
        planStatus={planStatus}
        planTitle={planTitle}
      />

      {scheduledRunId != null && (
        <PlanRunCancelScheduledDialog
          onOpenChange={setCancelOpen}
          open={cancelOpen}
          planId={planId}
          planRunId={scheduledRunId}
        />
      )}

      <PlanRunDialog
        branch={branch ?? ''}
        checkoutId={checkoutId ?? ''}
        jobRunHooksJson={jobRunHooksJson}
        mode={runDialog.mode}
        models={models}
        onOpenChange={runDialog.onOpenChange}
        onSubmitted={runDialog.onSubmitted}
        open={runDialog.open}
        planId={planId}
        planStatus={planStatus}
        ralphTuningJson={ralphTuningJson}
        repositories={runDialog.repositories}
        repositoryId={repositoryId ?? ''}
        runConfigJson={runConfigJson}
        workflowRunBlocked={workflowRunBlocked}
        workflowRunBlockedReason={workflowRunBlockedReason}
        workingDirectory={workingDirectory ?? ''}
      />
    </>
  );
};
