import { Button, cn } from '@openthrottle/react-router-shadcn';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { ProjectPlanRowFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { ProjectPlanTasks } from '~/routing/projects/components/ProjectPlanTasks';
import {
  PROJECT_PLAN_TASKS_COPY,
  PROJECT_PLANS_COPY,
} from '~/routing/projects/data/copy';
import { useProjectPlanTasks } from '~/routing/projects/hooks/useProjectPlanTasks';

export interface ProjectPlanRowProps {
  /** The row's GlobalPopover actions (open, move, remove). */
  readonly actions: GlobalPopoverAction[];
  readonly className?: string;
  readonly plan: ProjectPlanRowFragment;
  /** 1-based position of the plan in the project's full order. */
  readonly position: number;
}

/**
 * @description One plan in the project's ordered list: position, title link,
 * task progress, status and row actions, plus a toggle that expands the plan's
 * tasks inline. Tasks load on the first expand (see `useProjectPlanTasks`) and
 * are kept while collapsed. Expansion is local state, never the URL, so it
 * cannot disturb the page's `?page=` pagination.
 */
export const ProjectPlanRow = (
  props: ProjectPlanRowProps,
): React.ReactElement => {
  const { actions, className, plan, position } = props;

  // Hooks
  const [expanded, setExpanded] = React.useState(false);
  const tasks = useProjectPlanTasks({ planId: plan.id });
  const tasksRegionId = React.useId();

  // Setup
  const { load } = tasks;

  // Handlers
  const onToggle = (): void => {
    if (!expanded) {
      load();
    }
    setExpanded(!expanded);
  };

  // Markup
  const renderStatus = (value: string): React.ReactNode => {
    if (isPlanStatusKey(value)) {
      return <PlanStatusBadge status={value} />;
    }
    return value;
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li className={cn('p-3', className)} data-testid="ProjectPlanRow">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-controls={tasksRegionId}
            aria-expanded={expanded}
            aria-label={`${PROJECT_PLAN_TASKS_COPY.toggleAriaLabelPrefix} ${plan.title}`}
            onClick={onToggle}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <ChevronRightIcon
              className={cn('transition-transform', expanded && 'rotate-90')}
            />
          </Button>
          <span className="text-muted-foreground w-6 text-right text-xs tabular-nums">
            {position}
          </span>
          <div className="min-w-0">
            <Link
              className="hover:text-primary block truncate text-sm font-medium underline-offset-2 hover:underline"
              to={`/plans/${plan.id}`}
            >
              {plan.title}
            </Link>
            <p className="text-muted-foreground text-xs">
              {plan.tasksCompletedCount}/{plan.taskCount} tasks
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {renderStatus(plan.status)}
          <GlobalPopover
            actions={actions}
            ariaLabel={`${PROJECT_PLANS_COPY.menuAriaLabelPrefix} ${plan.title}`}
          />
        </div>
      </div>
      <div hidden={!expanded} id={tasksRegionId}>
        {expanded && <ProjectPlanTasks planId={plan.id} tasks={tasks} />}
      </div>
    </li>
  );
};
