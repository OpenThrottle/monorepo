import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import SearchIndex from '../search._index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  searchIndexLoaderFixture,
  searchIndexLoaderFixtureEmptyQuery,
  searchIndexLoaderFixturePaginated,
} from '~/testing/search-route-fixtures';

describe('routes/search._index.tsx', () => {
  test('should render search shell, SearchForm, and SearchFilters', () => {
    const view = render(
      <MemoryRouter initialEntries={['/search?q=test']}>
        <SearchIndex
          actionData={undefined}
          loaderData={searchIndexLoaderFixture}
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
        loaderData={searchIndexLoaderFixturePaginated}
        matches={[] as any}
        params={{}}
      />,
    );

    expect(view.getByTestId('OpenThrottlePagination')).toBeInTheDocument();
    const nextLink = view.getByRole('link', { name: /next/i });
    expect(nextLink).toHaveAttribute(
      'href',
      expect.stringContaining('/search'),
    );
  });

  test('should render a result card for each chunk (SearchCard delegates by source)', () => {
    const view = renderRoutesStub(
      <SearchIndex
        actionData={undefined}
        loaderData={searchIndexLoaderFixture}
        matches={[] as any}
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
        loaderData={searchIndexLoaderFixtureEmptyQuery}
        matches={[] as any}
        params={{}}
      />,
    );

    expect(view.getByText(/Enter a query below/i)).toBeInTheDocument();
    expect(view.getByTestId('SearchIntroduction')).toBeInTheDocument();
  });
});
