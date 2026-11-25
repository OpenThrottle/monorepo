import type {
  DataTableCellContext,
  DataTableHeaderContext,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { SearchCodeMatchFragment } from '~/__generated__/graphql';
import {
  SEARCH_CODE_COPY,
  SEARCH_TABLE_COPY,
} from '~/routing/search/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import {
  searchCodeMatchFixture,
  searchCodeRepositoryFixture,
} from '~/testing/search-route-fixtures';

import { buildSearchCodeTableColumns } from '../buildSearchCodeTableColumns';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

interface PlainColumn {
  readonly cell?: (
    ctx: DataTableCellContext<SearchCodeMatchFragment, unknown>,
  ) => React.ReactNode;
  readonly header?: (
    ctx: DataTableHeaderContext<SearchCodeMatchFragment, unknown>,
  ) => React.ReactNode;
  readonly id?: string;
}

const columns = buildSearchCodeTableColumns(searchCodeRepositoryFixture).map(
  (column): PlainColumn => {
    return asMock(column);
  },
);

const renderCell = (
  id: string,
  match: SearchCodeMatchFragment,
): ReturnType<typeof renderRoutesStub> => {
  const column = columns.find((item) => {
    return item.id === id;
  });

  return renderRoutesStub(
    <div>{column?.cell?.(asMock({ row: { original: match } }))}</div>,
  );
};

describe('buildSearchCodeTableColumns', () => {
  test('defines match, score and actions columns in order', () => {
    expect(
      columns.map((column) => {
        return column.id;
      }),
    ).toEqual(['match', 'score', 'actions']);
  });

  test('renders header labels for the data columns', () => {
    const component = renderRoutesStub(
      <div>
        {columns.slice(0, 2).map((column) => {
          return <div key={column.id}>{column.header?.(asMock({}))}</div>;
        })}
      </div>,
    );

    expect(
      component.getByText(SEARCH_CODE_COPY.table.columns.match),
    ).toBeInTheDocument();
    expect(
      component.getByText(SEARCH_CODE_COPY.table.columns.score),
    ).toBeInTheDocument();
  });

  describe('match cell', () => {
    test('renders the path, line range and snippet', () => {
      const component = renderCell('match', searchCodeMatchFixture);

      expect(
        component.getByTestId('SearchCodeResultsTable-location'),
      ).toHaveTextContent('src/settle.ts:10–12');
      expect(
        component.getByTestId('SearchCodeResultsTable-snippet'),
      ).toHaveTextContent(searchCodeMatchFixture.content);
    });
  });

  describe('score cell', () => {
    test('rounds the score to a percent', () => {
      const component = renderCell('score', {
        ...searchCodeMatchFixture,
        score: 0.456,
      });

      expect(
        component.getByTestId('SearchCodeResultsTable-score'),
      ).toHaveTextContent('46%');
    });
  });

  describe('actions cell', () => {
    test('renders the row menu for the match location', () => {
      const component = renderCell('actions', searchCodeMatchFixture);

      expect(
        component.getByRole('button', {
          name: `${SEARCH_TABLE_COPY.actions.menuAriaLabelPrefix} src/settle.ts:10`,
        }),
      ).toBeInTheDocument();
    });
  });
});
