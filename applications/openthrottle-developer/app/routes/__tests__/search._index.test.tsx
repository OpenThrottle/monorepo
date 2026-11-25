import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import { renderRoutesStub } from '~/testing/route-fixtures';
import type { SearchIndexLoaderFixture } from '~/testing/search-route-fixtures';
import {
  searchCodeLoaderFixture,
  searchCodeRepositoryFixture,
  searchIndexLoaderFixture,
  searchIndexLoaderFixtureEmptyQuery,
  searchIndexLoaderFixturePaginated,
} from '~/testing/search-route-fixtures';

import SearchIndex from '../search._index';

/**
 * @description Converts the shared (readonly) search fixture into the mutable
 * loader-data shape the route component expects, copying the chunk array.
 */
const toLoaderData = (
  fixture: SearchIndexLoaderFixture,
  reason: string | null = null,
) => {
  return {
    expandRankingDetails: fixture.expandRankingDetails,
    limit: fixture.limit,
    page: fixture.page,
    query: fixture.query,
    results: { chunks: [...fixture.results.chunks], reason },
    scope: fixture.scope,
    stats: fixture.stats,
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
  describe('when the search fell back because the model is missing', () => {
    test('shows the semantic-search-off notice above the results', async () => {
      const view = render(
        <TooltipProvider>
          <MemoryRouter initialEntries={['/search?q=test']}>
            <SearchIndex
              actionData={undefined}
              loaderData={toLoaderData(
                searchIndexLoaderFixture,
                'embedder_unconfigured',
              )}
              matches={stubMatches()}
              params={{}}
            />
          </MemoryRouter>
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(
          view.getByTestId('GlobalSemanticSearchOffNotice'),
        ).toBeInTheDocument();
      });
    });
  });

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
    expect(view.getByTestId('SearchResultsTable')).toBeInTheDocument();
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

  test('should render a table row for each chunk', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={toLoaderData(searchIndexLoaderFixture)}
        matches={stubMatches()}
        params={{}}
      />,
    );

    const titles = view.getAllByTestId('SearchResultsTable-title');
    expect(titles).toHaveLength(1);
    expect(view.getByTestId('SearchResultsTable-title')).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
  });

  describe('when the query is empty', () => {
    test('shows the description and corpus stats', () => {
      const view = render(
        <TooltipProvider>
          <MemoryRouter initialEntries={['/search?stats=open']}>
            <SearchIndex
              actionData={undefined}
              loaderData={toLoaderData(searchIndexLoaderFixtureEmptyQuery)}
              matches={stubMatches()}
              params={{}}
            />
          </MemoryRouter>
        </TooltipProvider>,
      );

      expect(
        view.getByTestId('SearchIntroduction-description'),
      ).toBeInTheDocument();
      expect(view.getByTestId('SearchStats')).toHaveAttribute(
        'data-kind',
        'corpus',
      );
    });
  });

  test('shows result stats for a query', () => {
    const view = render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/search?q=test&stats=open']}>
          <SearchIndex
            actionData={undefined}
            loaderData={toLoaderData(searchIndexLoaderFixture)}
            matches={stubMatches()}
            params={{}}
          />
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(view.getByTestId('SearchStats')).toHaveAttribute(
      'data-kind',
      'knowledge',
    );
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
    const snippet = view.getByTestId('SearchResultsTable-snippet');

    await user.click(snippet);

    expect(await view.findByTestId('SearchResultPreview')).toBeInTheDocument();
    expect(view.getByTestId('SearchResultsTable')).toBeInTheDocument();

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

  describe('in code scope', () => {
    test('renders the scope toggle, code matches and code stats', () => {
      const view = render(
        <TooltipProvider>
          <MemoryRouter
            initialEntries={['/search?q=settle&scope=code&stats=open']}
          >
            <SearchIndex
              actionData={undefined}
              loaderData={searchCodeLoaderFixture}
              matches={stubMatches()}
              params={{}}
            />
          </MemoryRouter>
        </TooltipProvider>,
      );

      expect(view.getByTestId('SearchScopeToggle')).toBeInTheDocument();
      expect(view.getByTestId('SearchCodeResultsTable')).toBeInTheDocument();
      expect(view.queryByTestId('SearchResultsTable')).toBeNull();
      expect(view.getByTestId('SearchStats')).toHaveAttribute(
        'data-kind',
        'code',
      );
    });

    test('offers a repository picker only with several repositories', () => {
      const single = render(
        <TooltipProvider>
          <MemoryRouter initialEntries={['/search?scope=code']}>
            <SearchIndex
              actionData={undefined}
              loaderData={searchCodeLoaderFixture}
              matches={stubMatches()}
              params={{}}
            />
          </MemoryRouter>
        </TooltipProvider>,
      );

      expect(single.queryByTestId('SearchCodeRepositoryPicker')).toBeNull();
      single.unmount();

      const several = render(
        <TooltipProvider>
          <MemoryRouter initialEntries={['/search?scope=code']}>
            <SearchIndex
              actionData={undefined}
              loaderData={{
                ...searchCodeLoaderFixture,
                code: {
                  ...searchCodeLoaderFixture.code,
                  repositories: [
                    ...searchCodeLoaderFixture.code.repositories,
                    {
                      ...searchCodeRepositoryFixture,
                      displayName: 'docs',
                      id: 'repo-2',
                    },
                  ],
                },
              }}
              matches={stubMatches()}
              params={{}}
            />
          </MemoryRouter>
        </TooltipProvider>,
      );

      expect(
        several.getByTestId('SearchCodeRepositoryPicker'),
      ).toBeInTheDocument();
    });
  });
});
