import * as React from 'react';
import { SearchDocumentationCard } from '~/routing/search/components/SearchDocumentationCard';
import { SearchPlanCard } from '~/routing/search/components/SearchPlanCard';
import { SearchTaskCard } from '~/routing/search/components/SearchTaskCard';
import { normalizeSource } from '~/routing/search/utils/search-card';
import type { SearchChunk } from '~/__generated__/graphql';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';

export interface SearchCardProps {
  className?: string;
  defaultOpenWhy?: boolean;
  rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

/**
 * @description Delegates by result.source to SearchPlanCard, SearchTaskCard, or SearchDocumentationCard.
 */
export const SearchCard = (props: SearchCardProps): React.ReactElement => {
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
