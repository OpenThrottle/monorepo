/**
 * @description Action-fetcher state for {@link PlanToolbar}: the run / mark
 * complete / evaluate-rules fetchers, the derived status gates, and the
 * queue-success + error toast wiring. Extracted from the component per
 * component-primitive-shape R7 so the toolbar stays UI-focused.
 */
import * as React from 'react';
import { toast } from '@openthrottle/react-router-shadcn';
import { useFetcher } from 'react-router';
import { useActionToast } from '~/global/hooks/useActionToast';
import { action } from '~/routes/plans.$planId._index';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  getPlanIsRunning,
  getPlanIsTerminal,
} from '~/routing/plans/utils/utils.plans';
import { addRecentWorkspacePath } from '~/routing/plans/utils/workspace-path';

export interface UsePlanToolbarOptions {
  readonly planStatus?: string;
  /**
   * @description Optional absolute path to a local project directory; recorded
   * as a recent workspace path when a run is queued successfully.
   */
  readonly workingDirectory?: string;
}

export interface UsePlanToolbarResult {
  readonly fetcherEvaluateRules: ReturnType<typeof useFetcher<typeof action>>;
  readonly fetcherRunPlan: ReturnType<typeof useFetcher<typeof action>>;
  readonly fetcherSetPlanStatus: ReturnType<typeof useFetcher<typeof action>>;
  readonly isCompleted: boolean;
  readonly isRunning: boolean;
  readonly isTerminal: boolean;
}

export const usePlanToolbar = (
  options: UsePlanToolbarOptions,
): UsePlanToolbarResult => {
  const { planStatus, workingDirectory } = options;

  // Hooks
  const fetcherEvaluateRules = useFetcher<typeof action>();
  const fetcherRunPlan = useFetcher<typeof action>();
  const fetcherSetPlanStatus = useFetcher<typeof action>();
  const runPlanWasBusy = React.useRef(false);

  // Setup
  const isCompleted = planStatus === 'COMPLETED';
  // A run is active (QUEUED / IN_PROGRESS): gate mutating actions so they can't
  // fire out from under the worker. Kill run is the deliberate exception.
  const isRunning = getPlanIsRunning(planStatus);
  // The plan is finished/abandoned (COMPLETED / CANCELED / SKIPPED): there is no
  // more work to do here, so gate Run/Queue and Evaluate rules. Mark Complete is
  // deliberately excluded (stays gated on isCompleted only) so CANCELED/SKIPPED
  // keep their sole recovery path to done.
  const isTerminal = getPlanIsTerminal(planStatus);
  const setPlanStatusData = fetcherSetPlanStatus.data;
  const setPlanStatusError =
    setPlanStatusData != null &&
    typeof setPlanStatusData === 'object' &&
    'setPlanStatusError' in setPlanStatusData &&
    typeof setPlanStatusData.setPlanStatusError === 'string'
      ? setPlanStatusData.setPlanStatusError
      : undefined;

  const runPlanData = fetcherRunPlan.data;
  const runPlanError =
    runPlanData != null &&
    typeof runPlanData === 'object' &&
    'runPlanError' in runPlanData &&
    typeof runPlanData.runPlanError === 'string'
      ? runPlanData.runPlanError
      : undefined;

  const evaluateRulesData = fetcherEvaluateRules.data;
  const evaluateRulesError =
    evaluateRulesData != null &&
    typeof evaluateRulesData === 'object' &&
    'evaluatePlanRulesError' in evaluateRulesData &&
    typeof evaluateRulesData.evaluatePlanRulesError === 'string'
      ? evaluateRulesData.evaluatePlanRulesError
      : undefined;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcherRunPlan.state !== 'idle';

    if (runPlanWasBusy.current && !busy) {
      const data = fetcherRunPlan.data;

      if (data != null && typeof data === 'object') {
        if ('runPlan' in data && data.runPlan != null) {
          const run = data.runPlan;
          const jobId =
            run != null &&
            typeof run === 'object' &&
            'jobId' in run &&
            typeof run.jobId === 'string'
              ? run.jobId
              : null;

          if (workingDirectory != null && workingDirectory.trim() !== '') {
            addRecentWorkspacePath(workingDirectory.trim());
          }

          if (jobId != null && jobId !== '') {
            toast.success('Plan run queued', {
              description: `Job ${jobId}. Queue ${PLAN_RUN_BULLMQ_QUEUE_NAME}: ${planRunJobDetailPath(jobId)}`,
            });
          } else {
            toast.success(
              'Plan run queued. The worker uses tuning from Workflow run options (defaults apply when the panel is collapsed).',
            );
          }
        }
      }
    }

    runPlanWasBusy.current = busy;

    // 🪝 ...
  }, [fetcherRunPlan.state, fetcherRunPlan.data]);

  useActionToast(fetcherSetPlanStatus.data, {
    active: fetcherSetPlanStatus.state !== 'idle',
    error: () => setPlanStatusError,
    id: 'set-plan-status',
    success: 'Plan marked complete.',
  });

  useActionToast(fetcherRunPlan.data, {
    active: fetcherRunPlan.state !== 'idle',
    error: () => runPlanError,
    id: 'run-plan',
  });

  useActionToast(fetcherEvaluateRules.data, {
    active: fetcherEvaluateRules.state !== 'idle',
    error: () => evaluateRulesError,
    id: 'evaluate-plan-rules',
    success: 'Rules evaluation queued',
  });

  // 🔌 Short Circuit
  return {
    fetcherEvaluateRules,
    fetcherRunPlan,
    fetcherSetPlanStatus,
    isCompleted,
    isRunning,
    isTerminal,
  };
};
