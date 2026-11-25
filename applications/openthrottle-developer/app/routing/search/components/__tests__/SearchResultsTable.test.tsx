import type { RenderResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { SearchChunk } from '~/__generated__/graphql';
import { SEARCH_TABLE_COPY } from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { searchChunkFixture } from '~/testing/search-route-fixtures';

import { SearchResultsTable } from '../SearchResultsTable';

function mockSearchChunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    ...searchChunkFixture,
    content: 'Chunk content',
    planId: null,
    planTitle: null,
    similarity: 0.9,
    ...overrides,
  };
}

function renderTable(
  results: readonly SearchChunk[],
  onPreview: (
    result: SearchChunk,
    trigger: HTMLElement | null,
  ) => void = vi.fn(),
  hasQuery = true,
): RenderResult {
  return renderRoutesStub(
    <SearchResultsTable
      hasQuery={hasQuery}
      onPreview={onPreview}
      results={results}
    />,
    // A catch-all, so following a title link stays inside the stub.
    { path: '*' },
  );
}

describe('SearchResultsTable', () => {
  test('renders one row per result with its pill and relevance', () => {
    const component = renderTable([
      mockSearchChunk({ id: 'a', similarity: 0.734 }),
      mockSearchChunk({ id: 'b', source: 'task' }),
    ]);

    const pills = component.getAllByTestId('SearchResultsTable-pill');

    expect(pills).toHaveLength(2);
    expect(pills[1]).toHaveTextContent('task');
    expect(
      component.getAllByTestId('SearchResultsTable-relevance')[0],
    ).toHaveTextContent('73%');
  });

  describe('plan results', () => {
    test('link the title to the plan', () => {
      const component = renderTable([
        mockSearchChunk({ planId: 'plan-1', planTitle: 'My Plan' }),
      ]);
      const title = component.getByTestId('SearchResultsTable-title');

      expect(title).toHaveAttribute('href', '/plans/plan-1');
      expect(title).toHaveTextContent('My Plan');
    });

    test('render the title as text without a plan id', () => {
      const component = renderTable([mockSearchChunk({ planTitle: 'Orphan' })]);

      expect(component.getByTestId('SearchResultsTable-title').tagName).toBe(
        'SPAN',
      );
    });
  });

  describe('task results', () => {
    test('link the title to the task and the context to its plan', () => {
      const component = renderTable([
        mockSearchChunk({
          planId: 'plan-1',
          planTitle: 'Parent',
          source: 'task',
          taskId: 'task-1',
          taskTitle: 'Do it',
        }),
      ]);

      expect(component.getByTestId('SearchResultsTable-title')).toHaveAttribute(
        'href',
        '/plans/plan-1#task-task-1',
      );
      expect(
        component.getByTestId('SearchResultsTable-context'),
      ).toHaveAttribute('href', '/plans/plan-1');
    });
  });

  describe('documentation results', () => {
    test('link the title to the GitHub blob', () => {
      const component = renderTable([
        mockSearchChunk({
          source: 'documentation',
          sourcePath: 'docs/a.md',
          sourceRepo: 'org/repo',
          sourceSha: 'abc',
        }),
      ]);
      const title = component.getByTestId('SearchResultsTable-title');

      expect(title).toHaveAttribute(
        'href',
        'https://github.com/org/repo/blob/abc/docs/a.md',
      );
      expect(title).toHaveAttribute('target', '_blank');
    });
  });

  describe('previewing', () => {
    test('opens from the snippet, handing back the snippet as the trigger', async () => {
      const user = userEvent.setup();
      const onPreview = vi.fn();
      const result = mockSearchChunk();
      const component = renderTable([result], onPreview);
      const snippet = component.getByTestId('SearchResultsTable-snippet');

      await user.click(snippet);

      expect(onPreview).toHaveBeenCalledTimes(1);
      expect(onPreview).toHaveBeenCalledWith(result, snippet);
    });

    test('opens from a click elsewhere on the row', async () => {
      const user = userEvent.setup();
      const onPreview = vi.fn();
      const result = mockSearchChunk();
      const component = renderTable([result], onPreview);

      await user.click(component.getByTestId('SearchResultsTable-relevance'));

      expect(onPreview).toHaveBeenCalledWith(result, null);
    });

    test('does not open when the title link is clicked', async () => {
      const user = userEvent.setup();
      const onPreview = vi.fn();
      const component = renderTable(
        [mockSearchChunk({ planId: 'plan-1' })],
        onPreview,
      );

      await user.click(component.getByTestId('SearchResultsTable-title'));

      expect(onPreview).not.toHaveBeenCalled();
    });

    test('opens from the row actions menu', async () => {
      const user = userEvent.setup();
      const onPreview = vi.fn();
      const result = mockSearchChunk({ planId: 'plan-1' });
      const component = renderTable([result], onPreview);

      await user.click(
        component.getByRole('button', {
          name: new RegExp(SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix),
        }),
      );
      await user.click(
        await component.findByRole('menuitem', {
          name: SEARCH_TABLE_COPY.actions.preview,
        }),
      );

      await waitFor(() => {
        expect(onPreview).toHaveBeenCalledTimes(1);
      });
      expect(onPreview).toHaveBeenCalledWith(result, null);
    });
  });

  describe('when there are no results', () => {
    test('prompts for a query without one', () => {
      const component = renderTable([], vi.fn(), false);

      expect(
        component.getByText(SEARCH_TABLE_COPY.empty.noQuery.title),
      ).toBeInTheDocument();
    });

    test('says nothing matched with one', () => {
      const component = renderTable([], vi.fn(), true);

      expect(
        component.getByText(SEARCH_TABLE_COPY.empty.noResults.title),
      ).toBeInTheDocument();
    });
  });
});
