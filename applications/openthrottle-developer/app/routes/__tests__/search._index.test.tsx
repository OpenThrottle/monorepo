import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';
import type { SearchIndexLoaderFixture } from '~/testing/search-route-fixtures';
import {
  searchIndexLoaderFixture,
  searchIndexLoaderFixtureEmptyQuery,
  searchIndexLoaderFixturePaginated,
} from '~/testing/search-route-fixtures';

import SearchIndex from '../search._index';

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

/**
 * @description Empty `matches` stub for the route component (which ignores it),
 * typed to the component's `matches` prop without a cast.
 */
function stubMatches(): React.ComponentProps<typeof SearchIndex>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/search._index.tsx', () => {
  test('should render search shell, SearchToolbar, and results', () => {
    const view = render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/search?q=test']}>
          <SearchIndex
            actionData={undefined}
            loaderData={toLoaderData(searchIndexLoaderFixture)}
            matches={stubMatches()}
            params={{}}
          />
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(view.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(view.getByTestId('SearchToolbar')).toBeInTheDocument();
    expect(view.getByTestId('SearchCard')).toBeInTheDocument();
  });

  test('should render OpenThrottlePagination with basePath /search when multiple pages', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixturePaginated)}
        matches={stubMatches()}
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
        matches={stubMatches()}
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
        matches={stubMatches()}
        params={{}}
      />,
    );

    const cards = view.getAllByTestId('SearchCard');
    expect(cards).toHaveLength(1);
    expect(view.getByTestId('SearchCard-title')).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  test('should show enter-query guidance and workspace shortcuts when query is empty', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixtureEmptyQuery)}
        matches={stubMatches()}
        params={{}}
      />,
    );

    expect(view.getByTestId('SearchIntroduction-hint')).toBeInTheDocument();
    expect(view.getByTestId('SearchIntroduction')).toBeInTheDocument();
  });

  test('previews a result in a side sheet without leaving the page, returning focus on close', async () => {
    const user = userEvent.setup();
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixture)}
        matches={stubMatches()}
        params={{}}
      />,
    );
    const snippet = view.getByTestId('SearchCard-content');

    await user.click(snippet);

    expect(await view.findByTestId('SearchResultPreview')).toBeInTheDocument();
    expect(view.getByTestId('SearchCard')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(view.queryByTestId('SearchResultPreview')).toBeNull();
    });
    expect(snippet).toHaveFocus();
  });

  test('puts the results-per-page select in the pagination footer', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixture)}
        matches={stubMatches()}
        params={{}}
      />,
    );

    expect(view.getByTestId('OpenThrottlePaginationLimit')).toBeInTheDocument();
  });

  test('is no longer a beta route', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixture)}
        matches={stubMatches()}
        params={{}}
      />,
    );

    expect(view.queryByText('Beta:')).toBeNull();
  });
});
