import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_STATS_COPY } from '~/routing/search/data/copy';
import { createSearchKnowledgeStats } from '~/testing/search-route-fixtures';

import { SearchStatsKnowledge } from '../SearchStatsKnowledge';

describe('SearchStatsKnowledge', () => {
  describe('when ranking is hybrid', () => {
    test('renders results, mode and one card per source without a detail', () => {
      const component = render(
        <SearchStatsKnowledge view={createSearchKnowledgeStats(7)} />,
      );

      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(5);
      expect(
        component.getByText(SEARCH_STATS_COPY.mode.hybrid),
      ).toBeInTheDocument();
      expect(component.getByText(SEARCH_STATS_COPY.sources.plan)).toBeVisible();
      expect(component.queryByTestId('OpenThrottleStatCard-detail')).toBeNull();
    });
  });

  describe('when ranking fell back to keywords', () => {
    test('shows the lexical label and the reason', () => {
      const component = render(
        <SearchStatsKnowledge
          view={{
            ...createSearchKnowledgeStats(2),
            mode: 'lexical',
            reason: 'embedder_unconfigured',
          }}
        />,
      );

      expect(
        component.getByText(SEARCH_STATS_COPY.mode.lexical),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('OpenThrottleStatCard-detail'),
      ).toHaveTextContent(SEARCH_STATS_COPY.reason.embedder_unconfigured);
    });

    test('renders an unknown reason as the server sent it', () => {
      const component = render(
        <SearchStatsKnowledge
          view={{
            ...createSearchKnowledgeStats(2),
            mode: 'lexical',
            reason: 'something_new',
          }}
        />,
      );

      expect(
        component.getByTestId('OpenThrottleStatCard-detail'),
      ).toHaveTextContent('something_new');
    });
  });
});
