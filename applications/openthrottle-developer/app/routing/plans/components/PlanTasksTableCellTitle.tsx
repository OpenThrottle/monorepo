import * as React from 'react';
import { Row } from '@tanstack/react-table';
import { Link } from 'react-router';
import { PlanTaskRowFragment } from '~/__generated__/graphql';

export interface PlanTasksTableCellTitleProps {
  row: Row<PlanTaskRowFragment>;
}

export const PlanTasksTableCellTitle = (
  props: PlanTasksTableCellTitleProps,
) => {
  const { row } = props;

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
    <div className="overflow-hidden space-y-1">
      <h2 className="text-sm line-clamp-1 text-ellipsis font-medium">
        <Link
          aria-label={`Scroll to task: ${title}`}
          className="underline underline-offset-2 hover:text-primary"
          to={anchor}
          viewTransition={true}
        >
          {title}
        </Link>
      </h2>

      {task.assignee ? (
        <p className="text-xs text-muted-foreground">
          Assigned to {task.assignee}
        </p>
      ) : null}

      {description ? (
        <p
          className="text-xs text-muted-foreground line-clamp-2"
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
          className="text-xs text-muted-foreground line-clamp-1"
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
