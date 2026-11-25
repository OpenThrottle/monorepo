import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_STATS_COPY } from '~/routing/search/data/copy';

import { SearchStatsCorpus } from '../SearchStatsCorpus';

describe('SearchStatsCorpus', () => {
  describe('with coverage rows', () => {
    test('renders one card per entity with embedded over total', () => {
      const component = render(
        <SearchStatsCorpus
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
      const cards = component.getAllByTestId('OpenThrottleStatCard');

      expect(cards).toHaveLength(4);
      expect(cards[0]).toHaveTextContent(SEARCH_STATS_COPY.corpus.plan);
      expect(cards[0]).toHaveTextContent('3/4');
    });
  });

  describe('without coverage rows', () => {
    test('shows zero over zero for every entity', () => {
      const component = render(
        <SearchStatsCorpus view={{ coverage: [], kind: 'corpus' }} />,
      );

      component.getAllByTestId('OpenThrottleStatCard').forEach((card) => {
        expect(card).toHaveTextContent('0');
      });
      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(4);
    });
  });
});
