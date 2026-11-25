import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import type { SearchIndexCodeData } from '~/routing/search/types/search-index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  searchCodeIndexFixture,
  searchCodeLoaderFixture,
} from '~/testing/search-route-fixtures';

import { SearchCodeResults } from '../SearchCodeResults';

const renderResults = (
  data: SearchIndexCodeData,
): ReturnType<typeof renderRoutesStub> => {
  return renderRoutesStub(
    <SearchCodeResults data={data} query={data.query} />,
    { path: '*' },
  );
};

describe('SearchCodeResults', () => {
  describe('with a repository and a ready index', () => {
    test('renders the matches table and no notice', () => {
      const component = renderResults(searchCodeLoaderFixture);

      expect(
        component.getByTestId('SearchCodeResultsTable-location'),
      ).toHaveTextContent('src/settle.ts');
      expect(component.queryByTestId('SearchCodeNotice')).toBeNull();
    });

    test('paginates with the matches label', () => {
      const component = renderResults({
        ...searchCodeLoaderFixture,
        total: 25,
      });

      expect(
        component.getByTestId('OpenThrottlePagination'),
      ).toBeInTheDocument();
      expect(
        component.getByText(
          new RegExp(SEARCH_CODE_COPY.pagination.resultLabel),
        ),
      ).toBeInTheDocument();
    });
  });

  describe('without a registered repository', () => {
    test('shows the notice and no table', () => {
      const component = renderResults({
        ...searchCodeLoaderFixture,
        code: {
          ...searchCodeLoaderFixture.code,
          index: null,
          matches: [],
          repository: null,
        },
        total: 0,
      });

      expect(component.getByTestId('SearchCodeNotice')).toHaveAttribute(
        'data-notice',
        'noRepository',
      );
      expect(component.queryByTestId('SearchCodeResultsTable')).toBeNull();
    });
  });

  describe('with a failed index', () => {
    test('shows the failed notice above the table', () => {
      const component = renderResults({
        ...searchCodeLoaderFixture,
        code: {
          ...searchCodeLoaderFixture.code,
          index: { ...searchCodeIndexFixture, status: 'failed' },
        },
      });

      expect(component.getByTestId('SearchCodeNotice')).toHaveAttribute(
        'data-notice',
        'failed',
      );
    });
  });
});
