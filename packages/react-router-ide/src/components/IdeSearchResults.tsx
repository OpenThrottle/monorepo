import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  cn,
} from '@openthrottle/react-router-shadcn';
import type { IdeSearchResult, SearchMatch } from '../data/view-models';
import { IdeSearchResultRow } from './IdeSearchResultRow';

export interface IdeSearchResultsProps {
  className?: string;
  /** True while the search loader is in flight. */
  loading?: boolean;
  /** Fired when a result row is activated. */
  onSelectMatch?: (match: SearchMatch) => void;
  /** The text-search result envelope from the loader. */
  result: IdeSearchResult;
}

/**
 * Renders text-search results: a `Skeleton` while loading, an `Empty` state when a
 * query returned nothing, otherwise the list of {@link IdeSearchResultRow}s with a
 * truncation note when matches were capped. Presentational; data arrives via props.
 *
 * @publicApi
 */
export const IdeSearchResults = (
  props: IdeSearchResultsProps,
): React.ReactElement => {
  const { className, loading = false, onSelectMatch, result } = props;

  // Setup
  const hasQuery = result.query.trim() !== '';
  const hasMatches = result.matches.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (loading) {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        data-testid="IdeSearchResults"
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!hasQuery) {
    return (
      <Empty className={className} data-testid="IdeSearchResults">
        <EmptyHeader>
          <EmptyTitle>Search the workspace</EmptyTitle>
          <EmptyDescription>
            Enter a query to search {result.repository.displayName} with
            ripgrep.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!hasMatches) {
    return (
      <Empty className={className} data-testid="IdeSearchResults">
        <EmptyHeader>
          <EmptyTitle>No matches</EmptyTitle>
          <EmptyDescription>
            Nothing matched “{result.query}” in {result.repository.displayName}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-1', className)}
      data-testid="IdeSearchResults"
    >
      {result.matches.map((match) => (
        <IdeSearchResultRow
          key={`${match.path}:${match.line}:${match.column}`}
          match={match}
          onSelect={onSelectMatch}
        />
      ))}
      {result.truncated ? (
        <p className="px-3 py-2 text-center text-xs text-muted-foreground">
          Results truncated — refine your query to narrow them.
        </p>
      ) : null}
    </div>
  );
};
