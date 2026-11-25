import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import { searchCodeIndexFixture } from '~/testing/search-route-fixtures';

import { SearchStatsCode } from '../SearchStatsCode';

describe('SearchStatsCode', () => {
  describe('with a ready index', () => {
    test('renders matches, status and indexed chunks', () => {
      const component = render(
        <SearchStatsCode
          view={{ index: searchCodeIndexFixture, kind: 'code', total: 3 }}
        />,
      );

      expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(3);
      expect(
        component.getByText(SEARCH_CODE_COPY.status.ready),
      ).toBeInTheDocument();
      expect(component.getByText('42')).toBeInTheDocument();
      expect(component.getByText('3')).toBeInTheDocument();
      expect(component.queryByTestId('OpenThrottleStatCard-detail')).toBeNull();
    });
  });

  describe('with a failed index', () => {
    test('shows the failure reason and a placeholder without a query', () => {
      const component = render(
        <SearchStatsCode
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

  describe('without an index', () => {
    test('reads as not indexed with zero chunks', () => {
      const component = render(
        <SearchStatsCode view={{ index: null, kind: 'code', total: null }} />,
      );

      expect(
        component.getByText(SEARCH_CODE_COPY.status.notIndexed),
      ).toBeInTheDocument();
      expect(component.getByText('0')).toBeInTheDocument();
    });
  });
});
