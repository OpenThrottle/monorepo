import * as React from 'react';
import classnames from 'classnames';
import { format } from 'date-fns';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';

export interface TaskDetailsProps {
  readonly className?: string;
  readonly planId: string;
  readonly task: PlanTaskRowFragment;
}

const DESCRIPTION_PREVIEW_LINES = 4;
const SUMMARY_PREVIEW_LINES = 3;

/**
 * @description Formats task date (createdAt/updatedAt) for display; returns "—" if invalid.
 */
function formatTaskDate(value: string | number | unknown): string {
  if (value == null) return '—';
  const date =
    typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? '—'
    : format(date, 'MMM d, yyyy h:mm a');
}

export const TaskDetails = (props: TaskDetailsProps) => {
  const { className, planId, task } = props;
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);

  const { projectRelation: project } = task;
  const hasDescription = task.description != null && task.description !== '';
  const hasSummary = task.summary != null && task.summary !== '';
  const descriptionLines = hasDescription
    ? task.description!.split('\n').length
    : 0;
  const summaryLines = hasSummary ? (task.summary!.split('\n').length ?? 0) : 0;
  const isLongDescription = descriptionLines > DESCRIPTION_PREVIEW_LINES;
  const isLongSummary = summaryLines > SUMMARY_PREVIEW_LINES;
  const showDescriptionPreview =
    hasDescription && isLongDescription && !descriptionExpanded;
  const showSummaryPreview = hasSummary && isLongSummary && !summaryExpanded;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="TaskDetails">
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 w-full">
            <CardTitle className="flex items-center gap-2 justify-between">
              <h1 className="text-2xl text-highlight">{task.title}</h1>
              <Badge variant="secondary">Task</Badge>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2 text-sm mb-6">
              <PlanStatusBadge
                status={task.status as keyof typeof PlanStatusBadge}
              />
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {task.assignee != null && task.assignee !== '' && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Assignee</dt>
                  <dd>{task.assignee}</dd>
                </div>
              )}
              {task.category != null && task.category !== '' && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{task.category}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Plan</dt>
                <dd>
                  <Link
                    className="hover:text-foreground underline"
                    to={`/plans/${planId}`}
                  >
                    View plan
                  </Link>
                </dd>
              </div>
              {project != null && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Project</dt>
                  <dd>
                    <Link
                      className="hover:text-foreground underline"
                      to={`/projects/${project.id}`}
                    >
                      {project.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatTaskDate(task.createdAt)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatTaskDate(task.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </CardHeader>

        {(hasDescription || hasSummary) && (
          <CardContent className="space-y-4">
            {hasDescription && (
              <div className="space-y-1">
                <p
                  className={classnames(
                    'text-sm text-muted-foreground',
                    showDescriptionPreview && 'line-clamp-4',
                  )}
                >
                  {task.description}
                </p>
                {isLongDescription && (
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                    onClick={() => setDescriptionExpanded((e) => !e)}
                    type="button"
                  >
                    {descriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
            {hasDescription && hasSummary && <Separator />}
            {hasSummary && (
              <div className="space-y-1">
                <blockquote
                  className={classnames(
                    'border-l-4 border-muted-foreground/30 pl-4 text-sm italic text-muted-foreground',
                    showSummaryPreview && 'line-clamp-3',
                  )}
                >
                  {task.summary}
                </blockquote>
                {isLongSummary && (
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                    onClick={() => setSummaryExpanded((e) => !e)}
                    type="button"
                  >
                    {summaryExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        )}

        <CardFooter>
          <Button asChild={true} variant="outline">
            <Link
              className="text-sm text-primary hover:underline"
              to={`/plans/${planId}/tasks/${task.id}/edit`}
            >
              Edit task
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
