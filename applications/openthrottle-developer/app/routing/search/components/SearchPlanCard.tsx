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

export interface SearchPlanCardProps {
  className?: string;
  result: SearchChunk;
}

const TITLE_CLASS = 'text-lg font-semibold leading-tight tracking-tight';

export const SearchPlanCard = (props: SearchPlanCardProps) => {
  const { className, result } = props;

  // Hooks

  // Setup
  const hasPlanLink = result.planId != null && result.planId !== '';

  // Handlers

  // Markup
  const sourceBadge = (
    <Badge data-testid="SearchPlanCard-sourceBadge" variant="secondary">
      {result.source}
    </Badge>
  );

  const similarityBlock =
    result.similarity != null ? (
      <p
        className="text-xs text-muted-foreground"
        data-testid="SearchPlanCard-similarity"
      >
        Relevance: {Math.round(result.similarity * 100)}%
      </p>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="SearchPlanCard" key={result.id}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">{sourceBadge}</div>
        <CardTitle
          className={`flex flex-wrap items-center gap-2 ${TITLE_CLASS}`}
        >
          {hasPlanLink ? (
            <Link
              className="underline-offset-4 hover:underline"
              data-testid="SearchPlanCard-planLink"
              to={`/plans/${result.planId}`}
            >
              {result.planTitle ?? 'Plan'}
            </Link>
          ) : (
            <h3 className={TITLE_CLASS}>{result.planTitle ?? 'Plan'}</h3>
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
