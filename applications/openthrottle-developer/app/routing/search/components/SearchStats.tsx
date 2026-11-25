import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SearchStatsCode } from '~/routing/search/components/SearchStatsCode';
import { SearchStatsCorpus } from '~/routing/search/components/SearchStatsCorpus';
import { SearchStatsKnowledge } from '~/routing/search/components/SearchStatsKnowledge';
import { SEARCH_STATS_GRID_CLASS } from '~/routing/search/data/search-stats';
import type { SearchStatsView } from '~/routing/search/types/search-stats';

export interface SearchStatsProps {
  readonly className?: string;
  readonly view: SearchStatsView;
}

export const SearchStats = (props: SearchStatsProps): React.ReactElement => {
  const { className, view } = props;

  // Hooks

  // Setup
  const gridClassName = SEARCH_STATS_GRID_CLASS[view.kind];

  // Handlers

  // Markup
  const corpusCards =
    view.kind === 'corpus' ? <SearchStatsCorpus view={view} /> : null;
  const knowledgeCards =
    view.kind === 'knowledge' ? <SearchStatsKnowledge view={view} /> : null;
  const codeCards =
    view.kind === 'code' ? <SearchStatsCode view={view} /> : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('grid gap-4 md:gap-8', gridClassName, className)}
      data-kind={view.kind}
      data-testid="SearchStats"
    >
      {corpusCards}
      {knowledgeCards}
      {codeCards}
    </div>
  );
};
