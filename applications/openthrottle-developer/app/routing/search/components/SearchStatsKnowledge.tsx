import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { SEARCH_STATS_COPY } from '~/routing/search/data/copy';
import type { SearchStatsKnowledgeView } from '~/routing/search/types/search-stats';
import {
  getLexicalReasonLabel,
  getSearchModeLabel,
} from '~/routing/search/utils/search-stats';

export interface SearchStatsKnowledgeProps {
  readonly view: SearchStatsKnowledgeView;
}

/** @description After a knowledge query: result count, how it was ranked, and its source split. */
export const SearchStatsKnowledge = (
  props: SearchStatsKnowledgeProps,
): React.ReactElement => {
  const { view } = props;
  const { mode, reason, sourceCounts, total } = view;

  // Hooks

  // Setup
  const modeColor = mode === 'lexical' ? 'bg-yellow-300' : undefined;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <OpenThrottleStatCard title={SEARCH_STATS_COPY.results} value={total} />
      <OpenThrottleStatCard
        color={modeColor}
        detail={getLexicalReasonLabel(reason)}
        title={SEARCH_STATS_COPY.modeTitle}
        value={getSearchModeLabel(mode)}
      />
      <OpenThrottleStatCard
        color="bg-green-300"
        title={SEARCH_STATS_COPY.sources.plan}
        value={sourceCounts.plan}
      />
      <OpenThrottleStatCard
        color="bg-blue-300"
        title={SEARCH_STATS_COPY.sources.task}
        value={sourceCounts.task}
      />
      <OpenThrottleStatCard
        color="bg-violet-300"
        title={SEARCH_STATS_COPY.sources.documentation}
        value={sourceCounts.documentation}
      />
    </>
  );
};
