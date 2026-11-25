import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { SearchCodeRepositoryFragment } from '~/__generated__/graphql';
import {
  SEARCH_CODE_COPY,
  SEARCH_TABLE_COPY,
} from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  searchCodeMatchFixture,
  searchCodeRepositoryFixture,
} from '~/testing/search-route-fixtures';

import { SearchCodeTableCellActions } from '../SearchCodeTableCellActions';

const renderActions = (
  repository: SearchCodeRepositoryFragment,
): ReturnType<typeof renderRoutesStub> => {
  return renderRoutesStub(
    <SearchCodeTableCellActions
      match={searchCodeMatchFixture}
      repository={repository}
    />,
  );
};

describe('SearchCodeTableCellActions', () => {
  test('labels the menu with the match location', () => {
    const component = renderActions(searchCodeRepositoryFixture);

    expect(
      component.getByRole('button', {
        name: `${SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix} src/settle.ts:10`,
      }),
    ).toBeInTheDocument();
  });

  describe('with a GitHub remote', () => {
    test('links the lines on GitHub', async () => {
      const user = userEvent.setup();
      const component = renderActions(searchCodeRepositoryFixture);

      await user.click(component.getByRole('button'));

      expect(
        await component.findByRole('menuitem', {
          name: SEARCH_CODE_COPY.table.actions.github,
        }),
      ).toHaveAttribute(
        'href',
        'https://github.com/acme/monorepo/blob/main/src/settle.ts#L10-L12',
      );
    });
  });

  describe('without a GitHub remote', () => {
    test('disables the GitHub action', async () => {
      const user = userEvent.setup();
      const component = renderActions({
        ...searchCodeRepositoryFixture,
        gitRemoteUrl: null,
      });

      await user.click(component.getByRole('button'));

      expect(
        await component.findByRole('menuitem', {
          name: SEARCH_CODE_COPY.table.actions.github,
        }),
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
