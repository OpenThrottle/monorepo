import * as React from 'react';
import { SearchDocumentationCard } from '~/routing/search/components/SearchDocumentationCard';
import { SearchPlanCard } from '~/routing/search/components/SearchPlanCard';
import { SearchTaskCard } from '~/routing/search/components/SearchTaskCard';
import type { SearchChunk } from '~/__generated__/graphql';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';

interface SearchCardProps {
  className?: string;
  readonly defaultOpenWhy?: boolean;
  readonly rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

/** Source discriminator for delegating to the appropriate card component. */
type SearchSource = 'plan' | 'task' | 'documentation';

/**
 * @description Normalizes API source string to the three supported card types.
 */
function normalizeSource(source: string): SearchSource {
  if (source === 'task' || source === 'documentation') {
    return source;
  }
  return 'plan';
}

/**
 * @description Delegates by result.source to SearchPlanCard, SearchTaskCard, or SearchDocumentationCard.
 */
export const SearchCard = (props: SearchCardProps) => {
  const { className, defaultOpenWhy, rankMeta, result } = props;

  // Hooks

  // Setup
  const source = normalizeSource(result.source);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (source === 'documentation') {
    return (
      <SearchDocumentationCard
        className={className}
        defaultOpenWhy={defaultOpenWhy}
        rankMeta={rankMeta}
        result={result}
      />
    );
  }

  if (source === 'task') {
    return (
      <SearchTaskCard
        className={className}
        defaultOpenWhy={defaultOpenWhy}
        rankMeta={rankMeta}
        result={result}
      />
    );
  }

  return (
    <SearchPlanCard
      className={className}
      defaultOpenWhy={defaultOpenWhy}
      rankMeta={rankMeta}
      result={result}
    />
  );
};
