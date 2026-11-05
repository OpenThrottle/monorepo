import {
  Card,
  CardContent,
  CardFooter,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanManagedTaskBadge } from '~/routing/plans/components/PlanManagedTaskBadge';
import { PlanTaskCardStatusBadge } from '~/routing/plans/components/PlanTaskCardStatusBadge';
import { PlanTaskInlineActions } from '~/routing/plans/components/PlanTaskInlineActions';
import { getTaskCardContext } from '~/routing/plans/utils/task-card-context';

const TASK_CARD_CONTEXT_TRUNCATE = 120;

export interface PlanTaskCardProps {
  className?: string;
  /** True when a tag→action rule manages this task's placement. */
  isManaged?: boolean;
  task: PlanTaskRowFragment;
}

export const PlanTaskCard = (props: PlanTaskCardProps): React.ReactElement => {
  const { className, isManaged = false, task } = props;

  // Hooks

  // Setup
  const title = task.title ?? 'Untitled';
  const taskHref = `/plans/${task.planId}/tasks/${task.id}`;
  const description = task.description?.trim() ?? '';
  const summary = task.summary?.trim() ?? '';
  const descriptionContext = getTaskCardContext(
    description,
    TASK_CARD_CONTEXT_TRUNCATE,
  );
  const summaryContext = getTaskCardContext(
    summary,
    TASK_CARD_CONTEXT_TRUNCATE,
  );

  // Handlers

  // Markup
  const assigneeLine = task.assignee && (
    <p className="text-muted-foreground text-xs">Assigned to {task.assignee}</p>
  );
  const projectLine = task.projectRelation && (
    <p className="text-xs">
      <Link
        className="text-muted-foreground hover:text-primary underline underline-offset-2"
        to={`/projects/${task.projectRelation.id}`}
        viewTransition={true}
      >
        {task.projectRelation.name}
      </Link>
    </p>
  );
  const descriptionLine = description && (
    <p
      className="text-muted-foreground line-clamp-2 text-xs"
      title={descriptionContext.title}
    >
      {descriptionContext.display}
    </p>
  );
  const summaryLine = summary && (
    <p
      className="text-muted-foreground line-clamp-1 text-xs"
      title={summaryContext.title}
    >
      {summaryContext.display}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('shadow-sm', className)}
      data-testid={`PlanTaskCard-${task.id}`}
    >
      <CardContent className="space-y-2 p-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlanTaskCardStatusBadge status={task.status} />
          {isManaged ? <PlanManagedTaskBadge /> : null}
        </div>
        <h4 className="text-sm leading-snug font-medium">
          <Link
            aria-label={`Open task: ${title}`}
            className="hover:text-primary underline underline-offset-2"
            to={taskHref}
            viewTransition={true}
          >
            {title}
          </Link>
        </h4>
        {assigneeLine}
        {projectLine}
        {descriptionLine}
        {summaryLine}
      </CardContent>
      <CardFooter className="border-border/50 flex justify-end border-t px-3 py-2">
        <PlanTaskInlineActions task={task} />
      </CardFooter>
    </Card>
  );
};
