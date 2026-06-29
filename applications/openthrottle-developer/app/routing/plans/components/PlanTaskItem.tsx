import * as React from 'react';
import classnames from 'classnames';
import { Badge } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { getRequirementsCount } from '~/routing/plans/utils/formatters';
import { PlanStatusChip } from '~/routing/plans/components/PlanStatusChip';
import { PlanTaskRowFragment } from '~/__generated__/graphql';

const TASK_CONTEXT_TRUNCATE = 120;

export interface PlanTaskItemProps {
  className?: string;
  step: number;
  task: PlanTaskRowFragment;
}

/**
 * @description Single task rendered as a list item — the compact, consolidated
 * alternative to the {@link PlanTabTasks} table row (status chip + step + title,
 * with metadata and context beneath). Pair with {@link PlanTaskItems}.
 */
export const PlanTaskItem = (props: PlanTaskItemProps): React.ReactElement => {
  const { className, step, task } = props;

  // Hooks

  // Setup
  const anchor = `/plans/${task.planId}/tasks/${task.id}`;

  const title = task.title || 'Untitled';
  const category = task.category?.trim() ?? '';
  const description = task.description?.trim() ?? '';
  const summary = task.summary?.trim() ?? '';
  const requirementsCount = getRequirementsCount(task.requirementsJson);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('space-y-2 overflow-hidden', className)}
      data-testid="PlanTaskItem"
      id={`task-${task.id}`}
    >
      <div className="flex items-center gap-2">
        <PlanStatusChip status={task.status} />
        <span
          aria-label={`Step ${step}`}
          className="text-muted-foreground shrink-0 text-sm tabular-nums"
        >
          #{step}
        </span>

        <h2 className="line-clamp-1 text-sm font-medium text-ellipsis">
          <Link
            aria-label={`Scroll to task: ${title}`}
            className="hover:text-primary underline underline-offset-2"
            to={anchor}
            viewTransition={true}
          >
            {title}
          </Link>
        </h2>
      </div>

      {category || requirementsCount > 0 || task.assignee ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
          {category ? (
            <Badge size="xs" variant="outline">
              {category}
            </Badge>
          ) : null}

          {requirementsCount > 0 ? (
            <Badge size="xs" variant="outline">
              <span className="tabular-nums">{requirementsCount}</span>
              {requirementsCount === 1 ? ' requirement' : ' requirements'}
            </Badge>
          ) : null}

          {task.assignee ? <span>Assigned to {task.assignee}</span> : null}
        </div>
      ) : null}

      <div className="mb-4" />

      {description ? (
        <p
          className="text-muted-foreground mt-2 line-clamp-3 text-sm"
          // title={
          //   description.length > TASK_CONTEXT_TRUNCATE ? description : undefined
          // }
        >
          {description}
          {/* {description.length > TASK_CONTEXT_TRUNCATE
            ? `${description.slice(0, TASK_CONTEXT_TRUNCATE)}…`
            : description} */}
        </p>
      ) : null}

      {summary ? (
        <p
          className="text-muted-foreground text-sm"
          title={summary.length > TASK_CONTEXT_TRUNCATE ? summary : undefined}
        >
          {summary.length > TASK_CONTEXT_TRUNCATE
            ? `${summary.slice(0, TASK_CONTEXT_TRUNCATE)}…`
            : summary}
        </p>
      ) : null}
    </div>
  );
};
