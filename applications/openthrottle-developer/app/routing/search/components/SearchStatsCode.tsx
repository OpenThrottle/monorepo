import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import type { SearchStatsCodeView } from '~/routing/search/types/search-stats';
import { getCodeIndexStatusLabel } from '~/routing/search/utils/code-search';

export interface SearchStatsCodeProps {
  readonly view: SearchStatsCodeView;
}

/** @description Code scope: matches for the query, and the selected repository's index. */
export const SearchStatsCode = (
  props: SearchStatsCodeProps,
): React.ReactElement => {
  const { view } = props;
  const { index, total } = view;

  // Hooks

  // Setup
  const statusLabel = getCodeIndexStatusLabel(index?.status ?? 'notIndexed');
  const isReady = index?.status === 'ready';
  const statusColor = isReady ? 'bg-green-300' : 'bg-yellow-300';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <OpenThrottleStatCard
        title={SEARCH_CODE_COPY.stats.results}
        value={total ?? SEARCH_CODE_COPY.stats.noQuery}
      />
      <OpenThrottleStatCard
        color={statusColor}
        detail={index?.failedReason ?? undefined}
        title={SEARCH_CODE_COPY.stats.status}
        value={statusLabel}
      />
      <OpenThrottleStatCard
        title={SEARCH_CODE_COPY.stats.indexedChunks}
        value={index?.indexedChunks ?? 0}
      />
    </>
  );
};
