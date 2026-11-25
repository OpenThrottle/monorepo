import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  SEARCH_CODE_COPY,
  SEARCH_STATS_COPY,
} from '~/routing/search/data/copy';
import {
  createSearchKnowledgeStats,
  searchCodeIndexFixture,
} from '~/testing/search-route-fixtures';

import { SearchStats } from '../SearchStats';

describe('SearchStats', () => {
  describe('when the view is the corpus', () => {
    test('renders one card per indexed entity', () => {
      const component = render(
        <SearchStats
          view={{
            coverage: [
              {
                __typename: 'EmbeddingCoverageObject',
                embedded: 3,
                entity: 'plan',
                total: 4,
              },
            ],
            kind: 'corpus',
          }}
        />,
      );

      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(4);
      expect(component.getByTestId('SearchStats')).toHaveAttribute(
        'data-kind',
        'corpus',
      );
    });
  });

  describe('when the view is knowledge results', () => {
    test('renders results, ranking and one card per source', () => {
      const component = render(
        <SearchStats view={createSearchKnowledgeStats(7)} />,
      );

      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(5);
      expect(
        component.getByText(SEARCH_STATS_COPY.mode.hybrid),
      ).toBeInTheDocument();
      expect(component.queryByTestId('OpenThrottleStatCard-detail')).toBeNull();
    });

    test('explains a keyword-only ranking', () => {
      const component = render(
        <SearchStats
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
      ).toBeInTheDocument();
    });
  });

  describe('when the view is code', () => {
    test('renders matches, index status and chunk count', () => {
      const component = render(
        <SearchStats
          view={{ index: searchCodeIndexFixture, kind: 'code', total: 3 }}
        />,
      );

      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(3);
      expect(
        component.getByText(SEARCH_CODE_COPY.status.ready),
      ).toBeInTheDocument();
    });

    test('shows the failure reason for a failed index', () => {
      const component = render(
        <SearchStats
          view={{
            index: {
              ...searchCodeIndexFixture,
              failedReason: 'disk full',
              status: 'failed',
            },
            kind: 'code',
            total: null,
          }}
        />,
      );

      expect(
        component.getByTestId('OpenThrottleStatCard-detail'),
      ).toHaveTextContent('disk full');
      expect(
        component.getByText(SEARCH_CODE_COPY.stats.noQuery),
      ).toBeInTheDocument();
    });
  });
});
