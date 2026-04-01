import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import SearchIndex from '../search._index';
import type { SearchChunk } from '~/__generated__/graphql';

const mockChunk: SearchChunk = {
  __typename: 'SearchChunk',
  content: 'A plan or task snippet',
  id: 'chunk-1',
  planId: 'plan-1',
  planTitle: 'Test Plan',
  similarity: 0.95,
  source: 'plan',
  taskId: null,
  taskTitle: null,
};

function makeChunks(count: number): SearchChunk[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockChunk,
    id: `chunk-${i + 1}`,
  }));
}

const mockLoaderData = {
  page: 1,
  query: 'test',
  results: {
    chunks: [mockChunk],
  },
};

const mockLoaderDataWithPagination = {
  page: 1,
  query: 'test',
  results: {
    chunks: makeChunks(15),
  },
};

describe('routes/search._index.tsx', () => {
  test('should render main, SearchForm, SearchFilters, and pagination', () => {
    const Component = () => (
      <SearchIndex
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    expect(view.getByRole('main')).toBeInTheDocument();
    expect(view.getByTestId('SearchForm')).toBeInTheDocument();
    expect(view.getByTestId('SearchFilters')).toBeInTheDocument();
    expect(view.getByText(/Showing 1-1 of 1/i)).toBeInTheDocument();
  });

  test('should render OpenThrottlePagination with basePath /search when multiple pages', () => {
    const Component = () => (
      <SearchIndex
        actionData={undefined}
        loaderData={mockLoaderDataWithPagination}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const nextLink = view.getByRole('link', { name: /next/i });
    expect(nextLink).toHaveAttribute(
      'href',
      expect.stringContaining('/search'),
    );
  });

  test('should render a result card for each chunk (SearchCard delegates by source)', () => {
    const Component = () => (
      <SearchIndex
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    const cards = view.getAllByTestId('SearchPlanCard');
    expect(cards).toHaveLength(1);
    expect(view.getByTestId('SearchPlanCard-planLink')).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  test('should show enter-query message when query is empty', () => {
    const loaderDataEmptyQuery = {
      page: 1,
      query: '',
      results: { chunks: [] },
    };
    const Component = () => (
      <SearchIndex
        actionData={undefined}
        loaderData={loaderDataEmptyQuery}
        matches={[] as any}
        params={{}}
      />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const view = render(<RoutesStub />);

    expect(view.getByText(/Enter a query to search/i)).toBeInTheDocument();
  });
});
