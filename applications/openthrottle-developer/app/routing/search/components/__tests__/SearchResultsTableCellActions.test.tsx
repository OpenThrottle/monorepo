import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { SearchChunk } from '~/__generated__/graphql';
import {
  SEARCH_PREVIEW_COPY,
  SEARCH_TABLE_COPY,
} from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { searchChunkFixture } from '~/testing/search-route-fixtures';

import { SearchResultsTableCellActions } from '../SearchResultsTableCellActions';

const documentationChunk: SearchChunk = {
  ...searchChunkFixture,
  source: 'documentation',
  sourcePath: 'docs/a.md',
  sourceRepo: 'org/repo',
  sourceSha: 'abc',
};

const orphanChunk: SearchChunk = {
  ...searchChunkFixture,
  planId: null,
  planTitle: null,
};

const openMenu = async (
  component: ReturnType<typeof renderRoutesStub>,
): Promise<void> => {
  const user = userEvent.setup();

  await user.click(
    component.getByRole('button', {
      name: new RegExp(SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix),
    }),
  );
};

describe('SearchResultsTableCellActions', () => {
  describe('with an internal target', () => {
    test('offers preview and an in-app open link', async () => {
      const component = renderRoutesStub(
        <SearchResultsTableCellActions
          onPreview={vi.fn()}
          result={searchChunkFixture}
        />,
      );

      await openMenu(component);

      expect(
        await component.findByRole('menuitem', {
          name: SEARCH_TABLE_COPY.actions.preview,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('menuitem', {
          name: SEARCH_PREVIEW_COPY.open.plan,
        }),
      ).toHaveAttribute('href', '/plans/plan-1');
    });

    test('previews with a null trigger', async () => {
      const user = userEvent.setup();
      const onPreview = vi.fn();
      const component = renderRoutesStub(
        <SearchResultsTableCellActions
          onPreview={onPreview}
          result={searchChunkFixture}
        />,
      );

      await openMenu(component);
      await user.click(
        await component.findByRole('menuitem', {
          name: SEARCH_TABLE_COPY.actions.preview,
        }),
      );

      expect(onPreview).toHaveBeenCalledWith(searchChunkFixture, null);
    });
  });

  describe('with an external target', () => {
    test('offers the GitHub link', async () => {
      const component = renderRoutesStub(
        <SearchResultsTableCellActions
          onPreview={vi.fn()}
          result={documentationChunk}
        />,
      );

      await openMenu(component);

      expect(
        await component.findByRole('menuitem', {
          name: SEARCH_PREVIEW_COPY.open.documentation,
        }),
      ).toHaveAttribute(
        'href',
        'https://github.com/org/repo/blob/abc/docs/a.md',
      );
    });
  });

  describe('with no target', () => {
    test('offers only preview', async () => {
      const component = renderRoutesStub(
        <SearchResultsTableCellActions
          onPreview={vi.fn()}
          result={orphanChunk}
        />,
      );

      await openMenu(component);

      expect(await component.findAllByRole('menuitem')).toHaveLength(1);
    });
  });
});
