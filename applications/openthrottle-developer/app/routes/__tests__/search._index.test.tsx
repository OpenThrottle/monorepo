import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import SearchIndex from '../search._index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { SearchIndexLoaderFixture } from '~/testing/search-route-fixtures';
import {
  searchIndexLoaderFixture,
  searchIndexLoaderFixtureEmptyQuery,
  searchIndexLoaderFixturePaginated,
} from '~/testing/search-route-fixtures';

/**
 * @description Converts the shared (readonly) search fixture into the mutable
 * loader-data shape the route component expects, copying the chunk array.
 */
const toLoaderData = (fixture: SearchIndexLoaderFixture) => {
  return {
    expandRankingDetails: fixture.expandRankingDetails,
    limit: fixture.limit,
    page: fixture.page,
    query: fixture.query,
    results: { chunks: [...fixture.results.chunks] },
    total: fixture.total,
  };
};

describe('routes/search._index.tsx', () => {
  test('should render search shell, SearchForm, and SearchFilters', () => {
    const view = render(
      <MemoryRouter initialEntries={['/search?q=test']}>
        <SearchIndex
          actionData={undefined}
          loaderData={toLoaderData(searchIndexLoaderFixture)}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(view.getByTestId('SearchForm')).toBeInTheDocument();
    expect(view.getByTestId('SearchFilters')).toBeInTheDocument();
    expect(view.getByTestId('SearchPlanCard')).toBeInTheDocument();
  });

  test('should render OpenThrottlePagination with basePath /search when multiple pages', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixturePaginated)}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const nextLink = view.getByRole('link', { name: 'Go to next page' });
    const href = nextLink.getAttribute('href') ?? '';
    expect(href).toContain('/search?');
    expect(href).toContain('page=2');
    expect(href).toContain('q=test');
  });

  test('should preserve ranking details in pagination links when enabled', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={{
          ...toLoaderData(searchIndexLoaderFixturePaginated),
          expandRankingDetails: true,
          page: 1,
        }}
        matches={[] as never}
        params={{}}
      />,
    );

    const nextLink = view.getByRole('link', { name: 'Go to next page' });
    const href = nextLink.getAttribute('href') ?? '';
    expect(href).toContain('details=ranking');
    expect(href).toContain('q=test');
  });

  test('should render a result card for each chunk (SearchCard delegates by source)', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixture)}
        matches={[] as never}
        params={{}}
      />,
    );

    const cards = view.getAllByTestId('SearchPlanCard');
    expect(cards).toHaveLength(1);
    expect(view.getByTestId('SearchPlanCard-planLink')).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  test('should show enter-query guidance and workspace shortcuts when query is empty', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixtureEmptyQuery)}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(view.getByText(/Enter a query below/i)).toBeInTheDocument();
    expect(view.getByTestId('SearchIntroduction')).toBeInTheDocument();
  });
});
