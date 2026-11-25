import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { SEARCH_STATS_COPY } from '~/routing/search/data/copy';
import { SEARCH_CORPUS_ENTITIES } from '~/routing/search/data/search-stats';
import type { SearchStatsCorpusView } from '~/routing/search/types/search-stats';
import { getCorpusCount } from '~/routing/search/utils/search-stats';

export interface SearchStatsCorpusProps {
  readonly view: SearchStatsCorpusView;
}

/** @description Before a query: how much of each source is embedded and searchable. */
export const SearchStatsCorpus = (
  props: SearchStatsCorpusProps,
): React.ReactElement => {
  const { view } = props;
  const { coverage } = view;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {SEARCH_CORPUS_ENTITIES.map((entity) => {
        const count = getCorpusCount(coverage, entity);

        return (
          <OpenThrottleStatCard
            key={entity}
            subValue={count.total}
            title={SEARCH_STATS_COPY.corpus[entity]}
            value={count.embedded}
          />
        );
      })}
    </>
  );
};
