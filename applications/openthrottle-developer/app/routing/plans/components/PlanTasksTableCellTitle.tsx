import * as React from 'react';
import { Row } from '@tanstack/react-table';
import { Link } from 'react-router';
import { PlanManagedTaskBadge } from '~/routing/plans/components/PlanManagedTaskBadge';
import { PlanTaskRowFragment } from '~/__generated__/graphql';

export interface PlanTasksTableCellTitleProps {
  /** True when a tag→action rule manages this task's placement. */
  isManaged?: boolean;
  row: Row<PlanTaskRowFragment>;
}

export const PlanTasksTableCellTitle = (
  props: PlanTasksTableCellTitleProps,
): React.ReactElement => {
  const { isManaged = false, row } = props;

  // Hooks

  // Setup
  const TASK_TITLE_CONTEXT_TRUNCATE = 120;

  const task = row.original;
  const anchor = `/plans/${task.planId}/tasks/${task.id}`;

  const title = task.title ?? 'Untitled';
  const description = task.description?.trim() ?? '';
  const summary = task.summary?.trim() ?? '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <h2 className="line-clamp-1 min-w-0 text-sm font-medium text-ellipsis">
          <Link
            aria-label={`Scroll to task: ${title}`}
            className="hover:text-primary underline underline-offset-2"
            to={anchor}
            viewTransition={true}
          >
            {title}
          </Link>
        </h2>

        {isManaged ? <PlanManagedTaskBadge className="shrink-0" /> : null}
      </div>

      {task.assignee ? (
        <p className="text-muted-foreground text-xs">
          Assigned to {task.assignee}
        </p>
      ) : null}

      {description ? (
        <p
          className="text-muted-foreground line-clamp-2 text-xs"
          title={
            description.length > TASK_TITLE_CONTEXT_TRUNCATE
              ? description
              : undefined
          }
        >
          {description.length > TASK_TITLE_CONTEXT_TRUNCATE
            ? `${description.slice(0, TASK_TITLE_CONTEXT_TRUNCATE)}…`
            : description}
        </p>
      ) : null}

      {summary ? (
        <p
          className="text-muted-foreground line-clamp-1 text-xs"
          title={
            summary.length > TASK_TITLE_CONTEXT_TRUNCATE ? summary : undefined
          }
        >
          {summary.length > TASK_TITLE_CONTEXT_TRUNCATE
            ? `${summary.slice(0, TASK_TITLE_CONTEXT_TRUNCATE)}…`
            : summary}
        </p>
      ) : null}
    </div>
  );
};
