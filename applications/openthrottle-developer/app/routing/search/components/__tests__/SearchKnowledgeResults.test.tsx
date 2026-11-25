import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { SEARCH_TABLE_COPY } from '~/routing/search/data/copy';
import type { SearchIndexKnowledgeData } from '~/routing/search/types/search-index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  createSearchTestChunks,
  searchChunkFixture,
  searchIndexLoaderFixture,
} from '~/testing/search-route-fixtures';

import { SearchKnowledgeResults } from '../SearchKnowledgeResults';

const buildData = (
  overrides: Partial<SearchIndexKnowledgeData> = {},
): SearchIndexKnowledgeData => {
  return {
    ...searchIndexLoaderFixture,
    results: { chunks: [searchChunkFixture], reason: null },
    ...overrides,
  };
};

const renderResults = (
  data: SearchIndexKnowledgeData,
  expandRankingDetails = false,
): ReturnType<typeof renderRoutesStub> => {
  return renderRoutesStub(
    <SearchKnowledgeResults
      data={data}
      expandRankingDetails={expandRankingDetails}
      query={data.query}
    />,
    { path: '*' },
  );
};

describe('SearchKnowledgeResults', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  describe('with results', () => {
    test('renders the table and opens the preview from a snippet', async () => {
      const user = userEvent.setup();
      const component = renderResults(buildData());

      expect(component.getByTestId('SearchResultsTable')).toBeInTheDocument();
      expect(component.queryByTestId('SearchResultPreview')).toBeNull();

      await user.click(component.getByTestId('SearchResultsTable-snippet'));

      expect(
        await component.findByTestId('SearchResultPreview'),
      ).toBeInTheDocument();
    });

    test('paginates when results exceed the page size', () => {
      const component = renderResults(
        buildData({
          results: { chunks: createSearchTestChunks(10), reason: null },
          total: 15,
        }),
      );

      expect(
        component.getByTestId('OpenThrottlePagination'),
      ).toBeInTheDocument();
    });
  });

  describe('without results', () => {
    test('prompts for a query when the query is blank', () => {
      const component = renderResults(
        buildData({
          query: '  ',
          results: { chunks: [], reason: null },
          total: 0,
        }),
      );

      expect(
        component.getByText(SEARCH_TABLE_COPY.empty.noQuery.title),
      ).toBeInTheDocument();
      expect(component.queryByTestId('OpenThrottlePagination')).toBeNull();
    });
  });

  describe('when semantic search is off', () => {
    test('shows the keyword-fallback notice', async () => {
      const component = renderResults(
        buildData({
          results: {
            chunks: [searchChunkFixture],
            reason: 'embedder_unconfigured',
          },
        }),
      );

      expect(
        await component.findByTestId('GlobalSemanticSearchOffNotice'),
      ).toBeInTheDocument();
    });
  });
});
