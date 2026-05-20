import * as React from 'react';
import classnames from 'classnames';
import {
  Badge,
  Card,
  CardContent,
  CardFooter,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import { PlanTaskInlineActions } from '~/routing/plans/components/PlanTaskInlineActions';
import { formatPlanTaskStatus } from '~/routing/plans/utils/format-status';

const TASK_CARD_CONTEXT_TRUNCATE = 120;

export interface PlanTaskCardProps {
  className?: string;
  task: PlanTaskRowFragment;
}

export const PlanTaskCard = (props: PlanTaskCardProps) => {
  const { className, task } = props;

  // Hooks

  // Setup
  const title = task.title ?? 'Untitled';
  const taskHref = `/plans/${task.planId}/tasks/${task.id}`;
  const description = task.description?.trim() ?? '';
  const summary = task.summary?.trim() ?? '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('shadow-sm', className)}
      data-testid={`PlanTaskCard-${task.id}`}
    >
      <CardContent className="space-y-2 p-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {isPlanStatusKey(task.status) ? (
            <PlanStatusBadge status={task.status} />
          ) : (
            <Badge
              className="text-foreground"
              data-testid="PlanTaskCard-unknown-status"
              size="xs"
              variant="outline"
            >
              {formatPlanTaskStatus(task.status)}
            </Badge>
          )}
        </div>
        <h4 className="text-sm font-medium leading-snug">
          <Link
            aria-label={`Open task: ${title}`}
            className="underline underline-offset-2 hover:text-primary"
            to={taskHref}
            viewTransition={true}
          >
            {title}
          </Link>
        </h4>
        {task.assignee ? (
          <p className="text-muted-foreground text-xs">
            Assigned to {task.assignee}
          </p>
        ) : null}
        {task.projectRelation ? (
          <p className="text-xs">
            <Link
              className="text-muted-foreground underline underline-offset-2 hover:text-primary"
              to={`/projects/${task.projectRelation.id}`}
              viewTransition={true}
            >
              {task.projectRelation.name}
            </Link>
          </p>
        ) : null}
        {description ? (
          <p
            className="text-muted-foreground line-clamp-2 text-xs"
            title={
              description.length > TASK_CARD_CONTEXT_TRUNCATE
                ? description
                : undefined
            }
          >
            {description.length > TASK_CARD_CONTEXT_TRUNCATE
              ? `${description.slice(0, TASK_CARD_CONTEXT_TRUNCATE)}…`
              : description}
          </p>
        ) : null}
        {summary ? (
          <p
            className="text-muted-foreground line-clamp-1 text-xs"
            title={
              summary.length > TASK_CARD_CONTEXT_TRUNCATE ? summary : undefined
            }
          >
            {summary.length > TASK_CARD_CONTEXT_TRUNCATE
              ? `${summary.slice(0, TASK_CARD_CONTEXT_TRUNCATE)}…`
              : summary}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="border-border/50 flex justify-end border-t px-3 py-2">
        <PlanTaskInlineActions task={task} />
      </CardFooter>
    </Card>
  );
};
