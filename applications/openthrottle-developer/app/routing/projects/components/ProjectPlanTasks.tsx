import { Button, cn, Skeleton } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { PlanTaskCardStatusBadge } from '~/routing/plans/components/PlanTaskCardStatusBadge';
import { PROJECT_PLAN_TASKS_VISIBLE_LIMIT } from '~/routing/projects/config/projects.defaults';
import { PROJECT_PLAN_TASKS_COPY } from '~/routing/projects/data/copy';
import type { UseProjectPlanTasksResult } from '~/routing/projects/hooks/useProjectPlanTasks';

export interface ProjectPlanTasksProps {
  readonly className?: string;
  readonly planId: string;
  /** The row's on-demand task state from `useProjectPlanTasks`. */
  readonly tasks: UseProjectPlanTasksResult;
}

/**
 * @description The expanded body of a project plan row: a loading skeleton,
 * an inline error with a retry, an empty note, or the plan's tasks in order,
 * each with its status and a link to the task page. Only the first
 * `PROJECT_PLAN_TASKS_VISIBLE_LIMIT` rows show until "Show all" is pressed;
 * that toggle is local state, so it never touches the URL.
 */
export const ProjectPlanTasks = (
  props: ProjectPlanTasksProps,
): React.ReactElement => {
  const { className, planId, tasks } = props;

  // Hooks
  const [showAll, setShowAll] = React.useState(false);

  // Setup
  const rows = tasks.state === 'loaded' ? tasks.tasks : [];
  const isCapped = rows.length > PROJECT_PLAN_TASKS_VISIBLE_LIMIT;
  const visible = showAll
    ? rows
    : rows.slice(0, PROJECT_PLAN_TASKS_VISIBLE_LIMIT);
  const showAllLabel = `${PROJECT_PLAN_TASKS_COPY.showAllPrefix} ${rows.length} ${PROJECT_PLAN_TASKS_COPY.showAllSuffix}`;
  const wrapperClassName = cn('pt-2 pl-18', className);

  // Handlers
  const onToggleShowAll = (): void => {
    setShowAll((current) => !current);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (tasks.state === 'idle' || tasks.state === 'loading') {
    return (
      <div
        aria-busy="true"
        className={cn(wrapperClassName, 'space-y-2')}
        data-testid="ProjectPlanTasks-loading"
      >
        <span className="sr-only">{PROJECT_PLAN_TASKS_COPY.loading}</span>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (tasks.state === 'error') {
    return (
      <div
        className={cn(wrapperClassName, 'flex items-center gap-2')}
        data-testid="ProjectPlanTasks-error"
        role="alert"
      >
        <p className="text-destructive text-xs">
          {PROJECT_PLAN_TASKS_COPY.error}
        </p>
        <Button onClick={tasks.load} size="xs" type="button" variant="outline">
          {PROJECT_PLAN_TASKS_COPY.retry}
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p
        className={cn(wrapperClassName, 'text-muted-foreground text-xs')}
        data-testid="ProjectPlanTasks-empty"
      >
        {PROJECT_PLAN_TASKS_COPY.empty}
      </p>
    );
  }

  return (
    <div className={wrapperClassName} data-testid="ProjectPlanTasks">
      <ol className="space-y-1">
        {visible.map((task) => (
          <li className="flex min-w-0 items-center gap-2" key={task.id}>
            <PlanTaskCardStatusBadge status={task.status} />
            <Link
              className="hover:text-primary truncate text-xs underline-offset-2 hover:underline"
              to={`/plans/${planId}/tasks/${task.id}`}
            >
              {task.title}
            </Link>
          </li>
        ))}
      </ol>
      {isCapped && (
        <Button
          className="mt-1 px-0"
          onClick={onToggleShowAll}
          size="xs"
          type="button"
          variant="link"
        >
          {showAll ? PROJECT_PLAN_TASKS_COPY.showFewer : showAllLabel}
        </Button>
      )}
    </div>
  );
};
