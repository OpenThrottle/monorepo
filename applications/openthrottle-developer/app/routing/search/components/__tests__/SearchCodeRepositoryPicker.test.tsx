import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_SCOPE_COPY } from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { searchCodeRepositoryFixture } from '~/testing/search-route-fixtures';

import { SearchCodeRepositoryPicker } from '../SearchCodeRepositoryPicker';

describe('SearchCodeRepositoryPicker', () => {
  test('shows the selected repository on the trigger', () => {
    const other = {
      ...searchCodeRepositoryFixture,
      displayName: 'docs',
      id: 'repo-2',
    };
    const component = renderRoutesStub(
      <SearchCodeRepositoryPicker
        query="settle"
        repositories={[searchCodeRepositoryFixture, other]}
        selected={other}
      />,
    );

    expect(
      component.getByRole('combobox', {
        name: SEARCH_SCOPE_COPY.repositoryLabel,
      }),
    ).toHaveTextContent('docs');
  });
});
