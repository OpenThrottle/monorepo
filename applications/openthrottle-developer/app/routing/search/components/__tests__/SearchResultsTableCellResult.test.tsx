import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { SearchChunk } from '~/__generated__/graphql';
import { SEARCH_PREVIEW_COPY } from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { searchChunkFixture } from '~/testing/search-route-fixtures';

import { SearchResultsTableCellResult } from '../SearchResultsTableCellResult';

const taskChunk: SearchChunk = {
  ...searchChunkFixture,
  planId: 'plan-1',
  planTitle: 'Parent',
  source: 'task',
  taskId: 'task-1',
  taskTitle: 'Do it',
};

describe('SearchResultsTableCellResult', () => {
  describe('with a context', () => {
    test('links the title and the context', () => {
      const component = renderRoutesStub(
        <SearchResultsTableCellResult onPreview={vi.fn()} result={taskChunk} />,
      );

      expect(component.getByTestId('SearchResultsTable-title')).toHaveAttribute(
        'href',
        '/plans/plan-1#task-task-1',
      );
      expect(
        component.getByTestId('SearchResultsTable-context'),
      ).toHaveAttribute('href', '/plans/plan-1');
    });
  });

  describe('without a context', () => {
    test('renders no context link', () => {
      const component = renderRoutesStub(
        <SearchResultsTableCellResult
          onPreview={vi.fn()}
          result={searchChunkFixture}
        />,
      );

      expect(component.queryByTestId('SearchResultsTable-context')).toBeNull();
    });
  });

  describe('previewing', () => {
    test('hands the result and the snippet button to onPreview', async () => {
      const user = userEvent.setup();
      const onPreview = vi.fn();
      const component = renderRoutesStub(
        <SearchResultsTableCellResult
          onPreview={onPreview}
          result={searchChunkFixture}
        />,
      );
      const snippet = component.getByRole('button', {
        name: new RegExp(SEARCH_PREVIEW_COPY.previewLabel),
      });

      await user.click(snippet);

      expect(onPreview).toHaveBeenCalledWith(searchChunkFixture, snippet);
    });
  });
});
