import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { SearchChunk } from '~/__generated__/graphql';
import { SearchWhyThisResult } from '~/routing/search/components/SearchWhyThisResult';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { planOrTaskDetailHref } from '~/routing/search/utils/plan-or-task-detail-href';

export interface SearchPlanCardProps {
  className?: string;
  defaultOpenWhy?: boolean;
  rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

const TITLE_CLASS = 'text-lg leading-tight tracking-tight';

export const SearchPlanCard = (
  props: SearchPlanCardProps,
): React.ReactElement => {
  const { className, defaultOpenWhy, rankMeta, result } = props;

  // Hooks

  // Setup
  const hasPlanLink = result.planId != null && result.planId !== '';
  const hasTaskOnPlan =
    hasPlanLink &&
    result.taskId != null &&
    result.taskId !== '' &&
    result.source === 'plan';
  const hasSimilarity = result.similarity != null;
  const similarityPercent = Math.round((result.similarity ?? 0) * 100);

  // Handlers
  const renderTaskLink = (): React.ReactNode => {
    const { planId, taskId, taskTitle } = result;

    if (!hasTaskOnPlan || planId == null) {
      return null;
    }

    const hasTaskTitle = taskTitle != null && taskTitle !== '';
    const label = hasTaskTitle ? `Task: ${taskTitle}` : 'View related task';

    return (
      <span className="text-muted-foreground text-sm font-normal">
        <Link
          className="underline-offset-4 hover:underline"
          data-testid="SearchPlanCard-taskLink"
          to={planOrTaskDetailHref(planId, taskId)}
        >
          {label}
        </Link>
      </span>
    );
  };

  // Markup
  const similarityText = (
    <p
      className="text-muted-foreground text-xs"
      data-testid="SearchPlanCard-similarity"
    >
      Relevance: {similarityPercent}%
    </p>
  );
  const planLink = (
    <Link
      className="underline-offset-4 hover:underline"
      data-testid="SearchPlanCard-planLink"
      prefetch="intent"
      to={`/plans/${result.planId}`}
    >
      {result.planTitle ?? 'Plan'}
    </Link>
  );
  const planHeading = (
    <h3 className={TITLE_CLASS}>{result.planTitle ?? 'Plan'}</h3>
  );
  const taskLink = renderTaskLink();

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="SearchPlanCard" key={result.id}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            color="green"
            data-testid="SearchPlanCard-sourceBadge"
            size="xs"
          >
            {result.source}
          </Badge>
        </div>
        <CardTitle
          className={cn(
            'flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2',
            TITLE_CLASS,
          )}
        >
          {hasPlanLink ? planLink : planHeading}
          {taskLink}
        </CardTitle>
      </CardHeader>
      {/* <Separator /> */}
      <CardContent className="space-y-3 pt-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {result.content}
        </p>
        {hasSimilarity ? similarityText : null}
        <SearchWhyThisResult
          defaultOpen={defaultOpenWhy}
          rankMeta={rankMeta}
          result={result}
        />
      </CardContent>
    </Card>
  );
};
