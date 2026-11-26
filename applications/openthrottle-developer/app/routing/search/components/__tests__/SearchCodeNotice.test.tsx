import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { searchCodeIndexFixture } from '~/testing/search-route-fixtures';

import { SearchCodeNotice } from '../SearchCodeNotice';

describe('SearchCodeNotice', () => {
  test('renders nothing for a ready index', () => {
    const component = renderRoutesStub(
      <SearchCodeNotice
        available={true}
        canListRepositories={true}
        index={searchCodeIndexFixture}
      />,
    );

    expect(component.queryByTestId('SearchCodeNotice')).toBeNull();
  });

  test('explains a missing repository', () => {
    const component = renderRoutesStub(
      <SearchCodeNotice
        available={true}
        canListRepositories={true}
        index={null}
      />,
    );

    expect(component.getByTestId('SearchCodeNotice')).toHaveAttribute(
      'data-notice',
      'noRepository',
    );
  });

  test('explains gated code search', () => {
    const component = renderRoutesStub(
      <SearchCodeNotice
        available={false}
        canListRepositories={true}
        index={{ ...searchCodeIndexFixture, status: 'unavailable' }}
      />,
    );

    expect(component.getByTestId('SearchCodeNotice')).toHaveAttribute(
      'data-notice',
      'gated',
    );
    expect(component.queryByRole('link')).toBeNull();
  });

  describe('when the caller may not list repositories', () => {
    test('explains the missing permission without an index link', () => {
      const component = renderRoutesStub(
        <SearchCodeNotice
          available={true}
          canListRepositories={false}
          index={null}
        />,
      );

      expect(component.getByTestId('SearchCodeNotice')).toHaveAttribute(
        'data-notice',
        'forbidden',
      );
      expect(component.queryByRole('link')).toBeNull();
    });
  });

  describe('when the repository is not indexed', () => {
    test('links to the IDE to index it', () => {
      const component = renderRoutesStub(
        <SearchCodeNotice
          available={true}
          canListRepositories={true}
          index={{
            ...searchCodeIndexFixture,
            indexedChunks: 0,
            status: 'notIndexed',
          }}
        />,
      );

      expect(
        component.getByRole('link', { name: SEARCH_CODE_COPY.indexLink }),
      ).toHaveAttribute('href', '/ide?repositoryId=repo-1');
    });
  });
});
