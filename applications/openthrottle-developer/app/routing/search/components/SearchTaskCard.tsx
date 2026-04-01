import * as React from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import type { SearchChunk } from '~/__generated__/graphql';

export interface SearchTaskCardProps {
  className?: string;
  result: SearchChunk;
}

/**
 * @description Builds plan detail URL; when taskId is present, appends hash for in-page task anchor.
 */
function planOrTaskHref(planId: string, taskId?: string | null): string {
  const base = `/plans/${planId}`;
  if (taskId != null && taskId !== '') {
    return `${base}#task-${taskId}`;
  }
  return base;
}

const TITLE_CLASS = 'text-lg font-semibold leading-tight tracking-tight';

export const SearchTaskCard = (props: SearchTaskCardProps) => {
  const { className, result } = props;

  // Hooks

  // Setup
  const hasPlanLink = result.planId != null && result.planId !== '';
  const hasTaskLink =
    hasPlanLink && result.taskId != null && result.taskId !== '';

  // Handlers

  // Markup
  const sourceBadge = (
    <Badge data-testid="SearchTaskCard-sourceBadge" variant="secondary">
      {result.source}
    </Badge>
  );

  const similarityBlock =
    result.similarity != null ? (
      <p
        className="text-xs text-muted-foreground"
        data-testid="SearchTaskCard-similarity"
      >
        Relevance: {Math.round(result.similarity * 100)}%
      </p>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="SearchTaskCard" key={result.id}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">{sourceBadge}</div>
        <CardTitle
          className={`flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 ${TITLE_CLASS}`}
        >
          <span className={TITLE_CLASS}>{result.taskTitle ?? 'Task'}</span>
          {hasPlanLink && (
            <span className="text-sm font-normal text-muted-foreground">
              {hasTaskLink ? (
                <>
                  <Link
                    className="underline-offset-4 hover:underline"
                    data-testid="SearchTaskCard-planLink"
                    to={`/plans/${result.planId}`}
                  >
                    {result.planTitle ?? 'Plan'}
                  </Link>
                  {' · '}
                  <Link
                    className="underline-offset-4 hover:underline"
                    data-testid="SearchTaskCard-taskLink"
                    to={planOrTaskHref(result.planId!, result.taskId)}
                  >
                    View task
                  </Link>
                </>
              ) : (
                <Link
                  className="underline-offset-4 hover:underline"
                  data-testid="SearchTaskCard-planLink"
                  to={`/plans/${result.planId}`}
                >
                  {result.planTitle ?? 'Plan'}
                </Link>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 pt-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {result.content}
        </p>
        {similarityBlock}
      </CardContent>
    </Card>
  );
};
