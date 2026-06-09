import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  cn,
} from '@openthrottle/react-router-shadcn';
import type { IdeSemanticResult } from '../data/view-models';
import { formatLocationLabel } from '../utils/formatLocationLabel';

export interface SemanticSearchResultsProps {
  className?: string;
  /** True while the semantic search is in flight. */
  loading?: boolean;
  /** The semantic-search envelope. When `available` is false, the gated state shows. */
  result: IdeSemanticResult;
}

/**
 * Renders natural-language code-search results: each match's similarity score, its
 * `path:startLine` location, and the matched code snippet. Shows a gated "index
 * unavailable" `Empty` when `result.available` is false, a loading `Skeleton`, or
 * an empty state. Presentational; data arrives via props.
 *
 * @publicApi
 */
export const SemanticSearchResults = (
  props: SemanticSearchResultsProps,
): React.ReactElement => {
  const { className, loading = false, result } = props;

  // Setup
  const hasQuery = result.query.trim() !== '';
  const hasMatches = result.matches.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!result.available) {
    return (
      <Empty className={className} data-testid="SemanticSearchResults">
        <EmptyHeader>
          <EmptyTitle>Semantic index unavailable</EmptyTitle>
          <EmptyDescription>
            Natural-language code search needs the code embeddings index, which
            ships separately. It will light up once the index is available.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (loading) {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        data-testid="SemanticSearchResults"
      >
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!hasQuery || !hasMatches) {
    return (
      <Empty className={className} data-testid="SemanticSearchResults">
        <EmptyHeader>
          <EmptyTitle>
            {hasQuery ? 'No matches' : 'Search the codebase'}
          </EmptyTitle>
          <EmptyDescription>
            {hasQuery
              ? `Nothing matched “${result.query}” in ${result.repository.displayName}.`
              : `Describe what you're looking for in ${result.repository.displayName}.`}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-testid="SemanticSearchResults"
    >
      {result.matches.map((match) => (
        <Card key={`${match.path}:${match.startLine}:${match.endLine}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate font-medium">
              {formatLocationLabel({ line: match.startLine, path: match.path })}
              {match.endLine > match.startLine ? `–${match.endLine}` : ''}
            </span>
            <Badge size="xs">{match.score.toFixed(2)}</Badge>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
              {match.content}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
