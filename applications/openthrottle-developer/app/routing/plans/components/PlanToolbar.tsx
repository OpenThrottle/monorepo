import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

export interface PlanToolbarProps {
  readonly className?: string;
  readonly planId: string;
  readonly planStatus?: string;
}

/**
 * @description Toolbar for plan actions: Mark Complete, Run/Queue (status group), and Add Task / Edit Plan (actions menu). Uses shadcn Button, Tooltip, and DropdownMenu.
 */
export const PlanToolbar = (props: PlanToolbarProps): React.ReactElement => {
  const { className, planId, planStatus } = props;

  const fetcherRunPlan = useFetcher<typeof action>();
  const fetcherSetPlanStatus = useFetcher<typeof action>();

  const isCompleted = planStatus === 'COMPLETED';
  const setPlanStatusError =
    fetcherSetPlanStatus.data != null &&
    'setPlanStatusError' in fetcherSetPlanStatus.data
      ? (fetcherSetPlanStatus.data as { setPlanStatusError: string })
          .setPlanStatusError
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
            <TooltipContent side="top">
              {fetcherRunPlan.state !== 'idle'
                ? 'Submitting…'
                : 'Run or queue this plan'}
            </TooltipContent>
          </Tooltip>

          <a
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
            href="#workflow-run-options"
          >
            Workflow CLI options
          </a>
        </div>

        {setPlanStatusError != null && (
          <span className="text-destructive text-xs" role="alert">
            {setPlanStatusError}
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
