import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
import { shouldOfferKillPlanRun } from '~/routing/plans/utils/should-offer-kill-plan-run';

export interface PlanToolbarProps {
  readonly className?: string;
  readonly planId: string;
  /**
   * @description Display title for Kill run confirmation (defaults when omitted).
   */
  readonly planTitle?: string;
  readonly planStatus?: string;
  /**
   * @description JSON-serialized GraphQL Ralph tuning input for enqueuePlanRun, or empty when defaults only.
   */
  readonly ralphTuningJson?: string;
}

/**
 * @description Toolbar for plan actions: Mark Complete, Run/Queue (status group), and Add Task / Edit Plan (actions menu). Uses shadcn Button, Tooltip, and DropdownMenu.
 */
export const PlanToolbar = (props: PlanToolbarProps): React.ReactElement => {
  const {
    className,
    planId,
    planTitle = 'Untitled',
    planStatus,
    ralphTuningJson = '',
  } = props;

  const fetcherRunPlan = useFetcher<typeof action>();
  const fetcherSetPlanStatus = useFetcher<typeof action>();

  const runPlanWasBusy = React.useRef(false);
  React.useEffect(() => {
    const busy = fetcherRunPlan.state !== 'idle';
    if (runPlanWasBusy.current && !busy) {
      const data = fetcherRunPlan.data;
      if (data != null && typeof data === 'object') {
        if ('runPlan' in data && data.runPlan != null) {
          toast.success(
            'Plan run queued. The worker uses tuning from Workflow run options (defaults apply when the panel is collapsed).',
          );
        }
      }
    }
    runPlanWasBusy.current = busy;
  }, [fetcherRunPlan.state, fetcherRunPlan.data]);

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
      case 'QUEUED':
        return 'Queued';
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In progress';
      case 'PENDING':
        return 'Add to Queue';
      case 'SKIPPED':
        return 'Skipped';
      default:
        return 'Run plan';
    }
  };

  return (
    <TooltipProvider>
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
                <input name="intent" type="hidden" value="setPlanStatus" />
                <input name="planId" type="hidden" value={planId} />
                <input name="status" type="hidden" value="COMPLETED" />
                <Button
                  disabled={
                    fetcherSetPlanStatus.state !== 'idle' || isCompleted
                  }
                  size="sm"
                  type="submit"
                  variant="outline"
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
                <input name="intent" type="hidden" value="runPlan" />
                <input
                  name="ralphTuning"
                  type="hidden"
                  value={ralphTuningJson}
                />
                <Button
                  disabled={fetcherRunPlan.state !== 'idle'}
                  size="sm"
                  type="submit"
                  variant="default"
                >
                  <PlayCircle />
                  {getRunButtonLabel()}
                </Button>
              </fetcherRunPlan.Form>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {fetcherRunPlan.state !== 'idle'
                ? 'Submitting…'
                : 'Enqueue a worker run for this plan using tuning from Workflow run options (defaults apply if you have not changed them).'}
            </TooltipContent>
          </Tooltip>

          <KillPlanRunButton
            planId={planId}
            planTitle={planTitle}
            show={shouldOfferKillPlanRun(planStatus)}
            size="sm"
          />

          <a
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
            href="#workflow-run-options"
          >
            Workflow run options
          </a>
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
    </TooltipProvider>
  );
};
