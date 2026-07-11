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
import { IDE_SEMANTIC_STATUS } from '../data/view-models';
import { formatLocationLabel } from '../utils/formatLocationLabel';

export interface SemanticSearchResultsProps {
  className?: string;
  /** True while the semantic search is in flight. */
  loading?: boolean;
  /** The semantic-search envelope. `result.status` selects the rendered state. */
  result: IdeSemanticResult;
}

/**
 * Renders the semantic tier by `result.status`: a gated "index unavailable" `Empty`
 * (`unavailable`), a "not indexed yet" prompt (`notIndexed`), an indexing-in-progress
 * affordance (`indexing`), or — when `ready` — a loading `Skeleton`, an empty state,
 * or the ranked matches (similarity score, `path:startLine` location, snippet).
 * Presentational; data arrives via props.
 *
 * @public
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
  if (result.status === IDE_SEMANTIC_STATUS.unavailable) {
    return (
      <Empty className={className} data-testid="SemanticSearchResults">
        <EmptyHeader>
          <EmptyTitle>Semantic index unavailable</EmptyTitle>
          <EmptyDescription>
            Natural-language code search needs an embeddings provider
            (OPENAI_API_KEY or Ollama) configured on the server. It will light
            up once a provider is available.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (result.status === IDE_SEMANTIC_STATUS.notIndexed) {
    return (
      <Empty className={className} data-testid="SemanticSearchResults">
        <EmptyHeader>
          <EmptyTitle>Not indexed yet</EmptyTitle>
          <EmptyDescription>
            {`Index ${result.repository.displayName} to enable natural-language code search. Use the Index action above.`}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (result.status === IDE_SEMANTIC_STATUS.indexing) {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        data-testid="SemanticSearchResults"
      >
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Indexing…</EmptyTitle>
            <EmptyDescription>
              {`Building the code index for ${result.repository.displayName}. Search will be available when it finishes.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <Skeleton className="h-20 w-full" />
      </div>
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
          <CardHeader className="text-muted-foreground flex flex-row items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">
              {formatLocationLabel({ line: match.startLine, path: match.path })}
              {match.endLine > match.startLine ? `–${match.endLine}` : ''}
            </span>
            <Badge size="xs">{match.score.toFixed(2)}</Badge>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted overflow-auto rounded-md p-2 font-mono text-xs">
              {match.content}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
