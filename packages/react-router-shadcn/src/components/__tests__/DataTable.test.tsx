import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../DataTable';

type DemoRow = {
  children?: DemoRow[];
  id: string;
  name: string;
  value: number;
};

const columns: ColumnDef<DemoRow, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
];

const nestedColumns: ColumnDef<DemoRow, unknown>[] = [
  {
    cell: ({ row }) => (
      <div style={{ paddingLeft: row.depth * 8 }}>
        {row.getCanExpand() ? (
          <button onClick={row.getToggleExpandedHandler()} type="button">
            {row.getIsExpanded() ? 'Collapse' : 'Expand'} {row.original.name}
          </button>
        ) : null}
        <span>{row.original.name}</span>
      </div>
    ),
    header: 'Name',
    id: 'name',
  },
  { accessorKey: 'value', header: 'Value' },
];

const nestedData: DemoRow[] = [
  {
    children: [{ id: '1a', name: 'Alpha Child', value: 11 }],
    id: '1',
    name: 'Alpha',
    value: 10,
  },
  { id: '2', name: 'Beta', value: 20 },
];

const getSubRows = (original: DemoRow): DemoRow[] | undefined =>
  original.children;

const firstBodyButton = (container: HTMLElement): HTMLButtonElement => {
  const button = container.querySelector('tbody button');

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Expected an expand toggle in the table body.');
  }

  return button;
};

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

  it('renders no child rows when getSubRows is omitted', () => {
    const { container } = render(
      <DataTable<DemoRow, unknown> columns={columns} data={nestedData} />,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.textContent).not.toContain('Alpha Child');
  });

  it('hides child rows while their parent is collapsed', () => {
    const { container } = render(
      <DataTable<DemoRow, unknown>
        columns={nestedColumns}
        data={nestedData}
        getRowId={(original) => original.id}
        getSubRows={getSubRows}
      />,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.textContent).not.toContain('Alpha Child');
  });

  it('renders child rows for parents expanded via initialExpanded', () => {
    const { container } = render(
      <DataTable<DemoRow, unknown>
        columns={nestedColumns}
        data={nestedData}
        getRowId={(original) => original.id}
        getSubRows={getSubRows}
        initialExpanded={{ '1': true }}
      />,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(container.textContent).toContain('Alpha Child');
  });

  it('toggles a group open and closed and reports the change', async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const { container } = render(
      <DataTable<DemoRow, unknown>
        columns={nestedColumns}
        data={nestedData}
        getRowId={(original) => original.id}
        getSubRows={getSubRows}
        onExpandedChange={onExpandedChange}
      />,
    );

    await user.click(firstBodyButton(container));
    expect(container.textContent).toContain('Alpha Child');
    expect(onExpandedChange).toHaveBeenCalledWith({ '1': true });

    await user.click(firstBodyButton(container));
    expect(container.textContent).not.toContain('Alpha Child');
  });

  it('applies getRowProps to child rows too', () => {
    const { container } = render(
      <DataTable<DemoRow, unknown>
        columns={nestedColumns}
        data={nestedData}
        getRowId={(original) => original.id}
        getRowProps={(row) => ({ id: `row-${row.depth}-${row.id}` })}
        getSubRows={getSubRows}
        initialExpanded={{ '1': true }}
      />,
    );
    const ids = Array.from(container.querySelectorAll('tbody tr')).map((row) =>
      row.getAttribute('id'),
    );
    expect(ids).toEqual(['row-0-1', 'row-1-1a', 'row-0-2']);
  });
});
