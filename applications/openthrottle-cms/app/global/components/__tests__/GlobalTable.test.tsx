import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { GlobalTable } from '~/global/components/GlobalTable';
import {
  GLOBAL_TABLE_COLUMN_KIND,
  GLOBAL_TABLE_COPY,
} from '~/global/data/data.global-table';
import type { GlobalTableColumn } from '~/global/types/global-table';

interface DemoRow {
  readonly name: string;
  readonly status: string | null;
  readonly uuid: string;
}

const columns: readonly GlobalTableColumn<DemoRow>[] = [
  { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
  { header: 'Status', key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE },
];

const rows: readonly DemoRow[] = [
  { name: 'Home', status: 'ACTIVE', uuid: 'a' },
  { name: 'About', status: null, uuid: 'b' },
];

const getRowId = (row: DemoRow): string => {
  return row.uuid;
};

describe('GlobalTable', () => {
  describe('with rows', () => {
    it('renders a header per column and a row per record', () => {
      const component = render(
        <GlobalTable
          className={undefined}
          columns={columns}
          emptyState={undefined}
          getRowId={getRowId}
          rows={rows}
        />,
      );

      expect(
        component.getAllByRole('columnheader').map((cell) => cell.textContent),
      ).toEqual(['Name', 'Status']);
      expect(component.getAllByRole('row')).toHaveLength(3);
      expect(component.getByText('ACTIVE')).toBeInTheDocument();
      expect(
        component.getByText(GLOBAL_TABLE_COPY.missing),
      ).toBeInTheDocument();
    });
  });

  describe('without rows', () => {
    it('renders the default empty state', () => {
      const component = render(
        <GlobalTable
          className={undefined}
          columns={columns}
          emptyState={undefined}
          getRowId={getRowId}
          rows={[]}
        />,
      );

      expect(component.getByText(GLOBAL_TABLE_COPY.empty)).toBeInTheDocument();
    });

    it('renders a custom empty state', () => {
      const component = render(
        <GlobalTable
          className={undefined}
          columns={columns}
          emptyState="No layouts"
          getRowId={getRowId}
          rows={[]}
        />,
      );

      expect(component.getByText('No layouts')).toBeInTheDocument();
    });
  });
});
