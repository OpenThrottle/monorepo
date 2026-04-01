import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../DataTable';

type DemoRow = { id: string; name: string; value: number };

const columns: ColumnDef<DemoRow, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
];

describe('DataTable', () => {
  it('renders headers and rows for given columns and data', () => {
    const data: DemoRow[] = [
      { id: '1', name: 'Alpha', value: 10 },
      { id: '2', name: 'Beta', value: 20 },
    ];
    const { container } = render(
      <DataTable<DemoRow, unknown> columns={columns} data={data} />,
    );
    expect(container.textContent).toContain('Name');
    expect(container.textContent).toContain('Value');
    expect(container.textContent).toContain('Alpha');
    expect(container.textContent).toContain('10');
    expect(container.textContent).toContain('Beta');
    expect(container.textContent).toContain('20');
  });

  it('shows no results when data is empty', () => {
    const { container } = render(
      <DataTable<DemoRow, unknown> columns={columns} data={[]} />,
    );
    expect(container.textContent).toContain('No results.');
  });
});
