import * as React from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
} from '@openthrottle/react-router-shadcn';
import type { SearchChunk } from '~/__generated__/graphql';
import { SearchWhyThisResult } from '~/routing/search/components/SearchWhyThisResult';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { planOrTaskDetailHref } from '~/routing/search/utils/plan-or-task-detail-href';

export interface SearchTaskCardProps {
  className?: string;
  defaultOpenWhy?: boolean;
  rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

export const SearchTaskCard = (
  props: SearchTaskCardProps,
): React.ReactElement => {
  const { className, defaultOpenWhy, rankMeta, result } = props;

  // Hooks

  // Setup
  const titleClass = 'text-lg leading-tight tracking-tight';
  const hasPlanLink = result.planId != null && result.planId !== '';
  const hasTaskLink =
    hasPlanLink && result.taskId != null && result.taskId !== '';

  // Handlers

  // Markup
  const similarityBlock =
    result.similarity != null ? (
      <p
        className="text-muted-foreground text-xs"
        data-testid="SearchTaskCard-similarity"
      >
        Relevance: {Math.round(result.similarity * 100)}%
      </p>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="SearchTaskCard" key={result.id}>
      <CardHeader
        className={`flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 ${titleClass}`}
      >
        <div className="flex flex-wrap items-center">
          <Badge
            color="blue"
            data-testid="SearchTaskCard-sourceBadge"
            size="xs"
          >
            {result.source}
          </Badge>
        </div>
        <span className={titleClass}>{result.taskTitle ?? 'Task'}</span>
        {hasPlanLink && (
          <span className="text-muted-foreground text-sm font-normal">
            {hasTaskLink ? (
              <>
                <Link
                  className="underline-offset-4 hover:underline"
                  data-testid="SearchTaskCard-planLink"
                  prefetch="intent"
                  to={`/plans/${result.planId}`}
                >
                  {result.planTitle ?? 'Plan'}
                </Link>
                {' · '}
                <Link
                  className="underline-offset-4 hover:underline"
                  data-testid="SearchTaskCard-taskLink"
                  to={planOrTaskDetailHref(result.planId!, result.taskId)}
                >
                  View task
                </Link>
              </>
            ) : (
              <Link
                className="underline-offset-4 hover:underline"
                data-testid="SearchTaskCard-planLink"
                prefetch="intent"
                to={`/plans/${result.planId}`}
              >
                {result.planTitle ?? 'Plan'}
              </Link>
            )}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {result.content}
        </p>
        {similarityBlock}
        <SearchWhyThisResult
          defaultOpen={defaultOpenWhy}
          rankMeta={rankMeta}
          result={result}
        />
      </CardContent>
    </Card>
  );
};
