import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  SEARCH_CODE_COPY,
  SEARCH_TABLE_COPY,
} from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  searchCodeMatchFixture,
  searchCodeRepositoryFixture,
} from '~/testing/search-route-fixtures';

import { SearchCodeResultsTable } from '../SearchCodeResultsTable';

describe('SearchCodeResultsTable', () => {
  test('renders the location, snippet and score of each match', () => {
    const component = renderRoutesStub(
      <SearchCodeResultsTable
        hasQuery={true}
        matches={[searchCodeMatchFixture]}
        repository={searchCodeRepositoryFixture}
      />,
    );

    expect(
      component.getByTestId('SearchCodeResultsTable-location'),
    ).toHaveTextContent('src/settle.ts:10–12');
    expect(
      component.getByTestId('SearchCodeResultsTable-snippet'),
    ).toHaveTextContent(searchCodeMatchFixture.content);
    expect(
      component.getByTestId('SearchCodeResultsTable-score'),
    ).toHaveTextContent('82%');
  });

  test('opens the lines on GitHub from the actions menu', async () => {
    const user = userEvent.setup();
    const component = renderRoutesStub(
      <SearchCodeResultsTable
        hasQuery={true}
        matches={[searchCodeMatchFixture]}
        repository={searchCodeRepositoryFixture}
      />,
    );

    await user.click(
      component.getByRole('button', {
        name: new RegExp(SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix),
      }),
    );

    expect(
      await component.findByRole('menuitem', {
        name: SEARCH_CODE_COPY.table.actions.github,
      }),
    ).toHaveAttribute(
      'href',
      'https://github.com/acme/monorepo/blob/main/src/settle.ts#L10-L12',
    );
  });

  describe('when there are no matches', () => {
    test('prompts for a query without one', () => {
      const component = renderRoutesStub(
        <SearchCodeResultsTable
          hasQuery={false}
          matches={[]}
          repository={searchCodeRepositoryFixture}
        />,
      );

      expect(
        component.getByText(SEARCH_CODE_COPY.table.empty.noQuery.title),
      ).toBeInTheDocument();
    });

    test('says nothing matched with one', () => {
      const component = renderRoutesStub(
        <SearchCodeResultsTable
          hasQuery={true}
          matches={[]}
          repository={searchCodeRepositoryFixture}
        />,
      );

      expect(
        component.getByText(SEARCH_CODE_COPY.table.empty.noResults.title),
      ).toBeInTheDocument();
    });
  });
});
