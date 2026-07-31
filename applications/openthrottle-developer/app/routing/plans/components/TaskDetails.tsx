import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { formatTaskDate } from '~/routing/plans/utils/task-details';

export interface TaskDetailsProps {
  className?: string;
  planId: string;
  task: PlanTaskRowFragment;
}

const SUMMARY_PREVIEW_LINES = 3;

export const TaskDetails = (props: TaskDetailsProps): React.ReactElement => {
  const { className, planId, task } = props;
  const { projectRelation: project } = task;

  // Hooks
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);

  // Setup
  const hasDescription = task.description != null && task.description !== '';
  const hasSummary = task.summary != null && task.summary !== '';
  const summaryLines = hasSummary ? (task.summary!.split('\n').length ?? 0) : 0;
  const isLongSummary = summaryLines > SUMMARY_PREVIEW_LINES;

  // Handlers
  const handleToggleSummary = (): void => {
    setSummaryExpanded((expanded) => !expanded);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="TaskDetails">
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="w-full space-y-1.5">
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
              <MarkdownRenderer source={task.description ?? ''} />
            )}
            {hasDescription && hasSummary && <Separator />}
            {hasSummary && (
              <div className="space-y-1">
                <MarkdownRenderer source={task.summary ?? ''} />
                {isLongSummary && (
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs underline"
                    onClick={handleToggleSummary}
                    type="button"
                  >
                    {summaryExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
