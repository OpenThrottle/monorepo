import * as React from 'react';
import {
  Badge,
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Gauge, PlayCircle } from 'lucide-react';
import { useFetcher } from 'react-router';
import { action } from '~/routes/plans.$planId._index';
import { KillPlanRunButton } from '~/routing/plans/components/KillPlanRunButton';
import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { getPlanToolbarRunButtonLabel } from '~/routing/plans/utils/plan-toolbar-run-label';
import { getPlanIsCancelable } from '~/routing/plans/utils/utils.plans';

export interface PlanToolbarRunActionsProps {
  readonly branch?: string;
  readonly checkoutId?: string;
  readonly fetcherEvaluateRules: ReturnType<typeof useFetcher<typeof action>>;
  readonly fetcherRunPlan: ReturnType<typeof useFetcher<typeof action>>;
  readonly isRunning: boolean;
  readonly isTerminal: boolean;
  readonly jobRunHooksJson: string;
  /**
   * `undefined` while the deferred run history is still loading. The Stale badge
   * is withheld then — "not stale" is a claim we cannot make yet — but Kill still
   * renders, because an operator mid-run needs it and hiding a control is worse
   * than briefly offering one that may turn out to be a no-op.
   */
  readonly newestRunIsStale: boolean | undefined;
  readonly planId: string;
  readonly planStatus?: string;
  readonly planTitle: string;
  readonly ralphTuningJson: string;
  readonly repositoryId?: string;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason?: string;
  readonly workingDirectory?: string;
}

/**
 * @description The {@link PlanToolbar} primary action group: the Run/Queue
 * enqueue form, the Evaluate rules form, and the Kill-run / Stale control for
 * an active run. Extracted from the toolbar per component-primitive-shape R6.
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
    newestRunIsStale,
    planId,
    planStatus,
    planTitle,
    ralphTuningJson,
    repositoryId,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  } = props;

  // Branch is a REQUIRED enqueue input; with it blank the run would fail fast at
  // the server boundary, so gate the Run control and surface the reason.
  const branchMissing = branch == null || branch.trim() === '';

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <fetcherRunPlan.Form method="post">
            <Input name="intent" type="hidden" value="runPlan" />
            <Input name="ralphTuning" type="hidden" value={ralphTuningJson} />
            {branch != null && branch !== '' && (
              <Input name="branch" type="hidden" value={branch} />
            )}
            {jobRunHooksJson !== '' ? (
              <Input
                name="jobRunHooksJson"
                type="hidden"
                value={jobRunHooksJson}
              />
            ) : null}
            {workingDirectory != null && workingDirectory !== '' && (
              <Input
                name="workingDirectory"
                type="hidden"
                value={workingDirectory}
              />
            )}
            {checkoutId != null && checkoutId !== '' && (
              <Input name="checkoutId" type="hidden" value={checkoutId} />
            )}
            {repositoryId != null && repositoryId !== '' && (
              <Input name="repositoryId" type="hidden" value={repositoryId} />
            )}
            <Button
              disabled={
                fetcherRunPlan.state !== 'idle' ||
                workflowRunBlocked ||
                branchMissing ||
                isRunning ||
                isTerminal
              }
              size="xs"
              type="submit"
              variant="ghost"
            >
              <PlayCircle />
              {getPlanToolbarRunButtonLabel(planStatus)}
            </Button>
          </fetcherRunPlan.Form>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          {/* Precedence: submitting > terminal > running > blocked > default
              (terminal and running are mutually exclusive). */}
          {fetcherRunPlan.state !== 'idle'
            ? 'Submitting…'
            : isTerminal
              ? PLAN_TOOLBAR_COPY.runTerminalTooltip
              : isRunning
                ? PLAN_TOOLBAR_COPY.runRunningTooltip
                : workflowRunBlocked
                  ? (workflowRunBlockedReason ??
                    'Fix workflow run options in Configuration (aligned with workflow-ralph argv).')
                  : branchMissing
                    ? 'Set the git branch in Configuration → Workspace before running (branch is required).'
                    : 'Enqueue a worker run for this plan using tuning from Workflow run options (defaults apply if you have not changed them).'}
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <fetcherEvaluateRules.Form method="post">
            <Input name="intent" type="hidden" value="evaluatePlanRules" />
            <Input name="planId" type="hidden" value={planId} />
            <Button
              disabled={
                fetcherEvaluateRules.state !== 'idle' || isRunning || isTerminal
              }
              size="xs"
              type="submit"
              variant="ghost"
            >
              <Gauge />
              {fetcherEvaluateRules.state !== 'idle'
                ? 'Evaluating…'
                : 'Evaluate rules'}
            </Button>
          </fetcherEvaluateRules.Form>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          {isTerminal
            ? PLAN_TOOLBAR_COPY.evaluateRulesTerminalTooltip
            : isRunning
              ? PLAN_TOOLBAR_COPY.evaluateRulesRunningTooltip
              : 'Queue a tag→action rules evaluation pass for this plan (recomputes skills-via-rules; results appear in the rule applications ledger).'}
        </TooltipContent>
      </Tooltip>

      {/* Only the Stale badge depends on run history. While it is undefined we
          render Kill — the normal control — rather than nothing: an operator
          mid-run needs Kill, and "not stale" is the claim we cannot yet make. */}
      {getPlanIsCancelable(planStatus) && newestRunIsStale === true ? (
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <Badge color="amber" size="xs">
              Stale
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            This run lost contact (its heartbeat went quiet) — the owning
            process likely crashed. Kill is unavailable because there is nothing
            live to stop; a background sweeper will settle it.
          </TooltipContent>
        </Tooltip>
      ) : (
        <KillPlanRunButton
          planId={planId}
          planTitle={planTitle}
          show={getPlanIsCancelable(planStatus)}
          size="xs"
        />
      )}
    </>
  );
};
