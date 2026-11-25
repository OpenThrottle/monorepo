import type {
  DataTableCellContext,
  DataTableHeaderContext,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { SearchChunk } from '~/__generated__/graphql';
import { SEARCH_TABLE_COPY } from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { searchChunkFixture } from '~/testing/search-route-fixtures';

import { buildSearchTableColumns } from '../buildSearchTableColumns';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

interface PlainColumn {
  readonly cell?: (
    ctx: DataTableCellContext<SearchChunk, unknown>,
  ) => React.ReactNode;
  readonly header?: (
    ctx: DataTableHeaderContext<SearchChunk, unknown>,
  ) => React.ReactNode;
  readonly id?: string;
}

const columns = buildSearchTableColumns(vi.fn()).map((column): PlainColumn => {
  return asMock(column);
});

const renderCell = (
  id: string,
  result: SearchChunk,
): ReturnType<typeof renderRoutesStub> => {
  const column = columns.find((item) => {
    return item.id === id;
  });

  return renderRoutesStub(
    <div>{column?.cell?.(asMock({ row: { original: result } }))}</div>,
  );
};

describe('buildSearchTableColumns', () => {
  test('defines type, result, relevance and actions columns in order', () => {
    expect(
      columns.map((column) => {
        return column.id;
      }),
    ).toEqual(['type', 'result', 'relevance', 'actions']);
  });

  test('renders header labels for the data columns', () => {
    const component = renderRoutesStub(
      <div>
        {columns.slice(0, 3).map((column) => {
          return <div key={column.id}>{column.header?.(asMock({}))}</div>;
        })}
      </div>,
    );

    expect(
      component.getByText(SEARCH_TABLE_COPY.columns.type),
    ).toBeInTheDocument();
    expect(
      component.getByText(SEARCH_TABLE_COPY.columns.result),
    ).toBeInTheDocument();
    expect(
      component.getByText(SEARCH_TABLE_COPY.columns.relevance),
    ).toBeInTheDocument();
  });

  describe('type cell', () => {
    test('renders the normalized source as a pill', () => {
      const component = renderCell('type', {
        ...searchChunkFixture,
        source: 'task',
      });

      expect(
        component.getByTestId('SearchResultsTable-pill'),
      ).toHaveTextContent('task');
    });
  });

  describe('relevance cell', () => {
    test('rounds similarity to a percent', () => {
      const component = renderCell('relevance', {
        ...searchChunkFixture,
        similarity: 0.734,
      });

      expect(
        component.getByTestId('SearchResultsTable-relevance'),
      ).toHaveTextContent('73%');
    });
  });

  describe('result and actions cells', () => {
    test('result cell renders the linked title', () => {
      const component = renderCell('result', searchChunkFixture);

      expect(component.getByTestId('SearchResultsTable-title')).toHaveAttribute(
        'href',
        '/plans/plan-1',
      );
    });

    test('actions cell renders the row menu trigger', () => {
      const component = renderCell('actions', searchChunkFixture);

      expect(
        component.getByRole('button', {
          name: new RegExp(SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix),
        }),
      ).toBeInTheDocument();
    });
  });
});
