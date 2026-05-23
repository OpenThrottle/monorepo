import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  CheckCircle,
  ChevronDown,
  PencilIcon,
  PlayCircle,
  PlusCircle,
} from 'lucide-react';
import { Link, useFetcher } from 'react-router';
import { action } from '~/routes/plans.$planId._index';
import { KillPlanRunButton } from '~/routing/plans/components/KillPlanRunButton';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { getPlanIsCancelable } from '~/routing/plans/utils/utils.plans';
import { addRecentWorkspacePath } from '~/routing/plans/utils/workspace-path';

export interface PlanToolbarProps {
  className?: string;
  /**
   * @description JSON `{ hooks: [...] }` for enqueuePlanRun; empty when no hooks or invalid.
   */
  jobRunHooksJson?: string;
  planId: string;
  planStatus?: string;
  /**
   * @description Display title for Kill run confirmation (defaults when omitted).
   */
  planTitle?: string;
  /**
   * @description JSON-serialized GraphQL Ralph tuning input for enqueuePlanRun, or empty when defaults only.
   */
  ralphTuningJson?: string;
  /**
   * @description When true, queue/run is disabled (e.g. workflow-ralph option validation failed on the plan).
   */
  workflowRunBlocked?: boolean;
  /**
   * @description First validation message for tooltip when {@link workflowRunBlocked} is true.
   */
  workflowRunBlockedReason?: string;
  /**
   * @description Optional absolute path to a local project directory for multi-workspace runs.
   * Passed through to the enqueuePlanRun mutation as workingDirectory.
   */
  workingDirectory?: string;
}

/**
 * @description Toolbar for plan actions: Mark Complete, Run/Queue (status group),
 * and Add Task / Edit Plan (actions menu). Uses shadcn Button, Tooltip, and DropdownMenu.
 */
export const PlanToolbar = (props: PlanToolbarProps): React.ReactElement => {
  const {
    className,
    planId,
    planTitle = 'Untitled',
    planStatus,
    jobRunHooksJson = '',
    ralphTuningJson = '',
    workingDirectory,
    workflowRunBlocked = false,
    workflowRunBlockedReason,
  } = props;

  // Hooks
  const fetcherRunPlan = useFetcher<typeof action>();
  const fetcherSetPlanStatus = useFetcher<typeof action>();
  const runPlanWasBusy = React.useRef(false);

  // Setup
  const isCompleted = planStatus === 'COMPLETED';
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

  const getRunButtonLabel = (): string => {
    switch (planStatus) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In progress';
      case 'PENDING':
        return 'Add to Queue';
      case 'QUEUED':
        return 'Queued';
      case 'SKIPPED':
        return 'Skipped';

      default:
        return 'Run plan';
    }
  };

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

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'flex flex-1 flex-wrap items-center gap-2',
        className,
      )}
      data-testid="PlanToolbar"
    >
      {/* Status / run group */}
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <fetcherSetPlanStatus.Form method="post">
              <Input name="intent" type="hidden" value="setPlanStatus" />
              <Input name="planId" type="hidden" value={planId} />
              <Input name="status" type="hidden" value="COMPLETED" />
              <Button
                disabled={fetcherSetPlanStatus.state !== 'idle' || isCompleted}
                size="sm"
                type="submit"
                variant="ghost"
              >
                <CheckCircle />
                {fetcherSetPlanStatus.state !== 'idle'
                  ? 'Marking…'
                  : 'Mark Complete'}
              </Button>
            </fetcherSetPlanStatus.Form>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isCompleted
              ? 'Plan is already completed'
              : 'Mark this plan as completed'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild={true}>
            <fetcherRunPlan.Form method="post">
              <Input name="intent" type="hidden" value="runPlan" />
              <Input name="ralphTuning" type="hidden" value={ralphTuningJson} />
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
              <Button
                disabled={fetcherRunPlan.state !== 'idle' || workflowRunBlocked}
                size="sm"
                type="submit"
                variant="outline"
              >
                <PlayCircle />
                {getRunButtonLabel()}
              </Button>
            </fetcherRunPlan.Form>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            {fetcherRunPlan.state !== 'idle'
              ? 'Submitting…'
              : workflowRunBlocked
                ? (workflowRunBlockedReason ??
                  'Fix workflow run options in Configuration (aligned with workflow-ralph argv).')
                : 'Enqueue a worker run for this plan using tuning from Workflow run options (defaults apply if you have not changed them).'}
          </TooltipContent>
        </Tooltip>

        <KillPlanRunButton
          planId={planId}
          planTitle={planTitle}
          show={getPlanIsCancelable(planStatus)}
          // show={true}
          size="sm"
        />
      </div>

      {setPlanStatusError != null && (
        <span className="text-destructive text-xs" role="alert">
          {setPlanStatusError}
        </span>
      )}

      {runPlanError != null && (
        <span className="text-destructive text-xs" role="alert">
          {runPlanError}
        </span>
      )}

      <div className="flex-1" />

      <Link
        className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        to="#plan-workflow-run-transparency"
      >
        CLI preview and history
      </Link>

      {/* Add / edit group: DropdownMenu for secondary actions */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <DropdownMenuTrigger asChild={true}>
              <Button size="sm" variant="outline">
                Actions
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Add task or edit plan</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild={true}>
            <Link
              className="flex items-center gap-2"
              to={`/plans/${planId}/tasks/create`}
            >
              <PlusCircle size={14} />
              Add Task
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild={true}>
            <Link
              className="flex items-center gap-2"
              to={`/plans/${planId}/edit`}
            >
              <PencilIcon size={14} />
              Edit Plan
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
