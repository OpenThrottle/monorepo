import type { ColumnDef } from '@tanstack/react-table';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';
import { DataTable } from './DataTable';

interface Build {
  readonly branch: string;
  readonly duration: string;
  readonly id: string;
  readonly status: 'failed' | 'passed';
}

const DATA: Build[] = [
  { branch: 'main', duration: '2m 14s', id: '4821', status: 'passed' },
  {
    branch: 'feat/workbench',
    duration: '2m 02s',
    id: '4820',
    status: 'passed',
  },
  {
    branch: 'fix/toast-guard',
    duration: '0m 48s',
    id: '4819',
    status: 'failed',
  },
];

const COLUMNS: ColumnDef<Build>[] = [
  { accessorKey: 'id', header: 'Build' },
  { accessorKey: 'branch', header: 'Branch' },
  {
    accessorKey: 'status',
    cell: ({ row }) => (
      <Badge color={row.original.status === 'passed' ? 'green' : 'red'}>
        {row.original.status}
      </Badge>
    ),
    header: 'Status',
  },
  { accessorKey: 'duration', header: 'Duration' },
];

/**
 * `DataTable` is generic, and the usual `satisfies Meta<typeof DataTable>` form
 * collapses `TData`/`TValue` to `unknown` — which makes every `columns`/`data`
 * arg an error. Naming the instantiated type up front is what keeps the args
 * strongly typed for a generic component.
 */
type BuildTable = typeof DataTable<Build, unknown>;

const meta: Meta<BuildTable> = {
  component: DataTable,
  parameters: { controls: { disable: true } },
  title: 'Components/DataTable',
};

export default meta;

type Story = StoryObj<BuildTable>;

/**
 * `DataTable` is generic over the row type and takes TanStack `ColumnDef`s, so
 * the interesting surface is the column definitions rather than props on the
 * component. A `cell` renderer is included because that is where most real
 * columns end up.
 */
export const Default: Story = {
  args: { columns: COLUMNS, data: DATA },
};

/** The built-in empty state, shown whenever `data` is empty. */
export const Empty: Story = {
  args: { columns: COLUMNS, data: [] },
};

/** `emptyState` accepts a node, not just a string. */
export const CustomEmptyState: Story = {
  args: {
    columns: COLUMNS,
    data: [],
    emptyState: (
      <span className="text-muted-foreground">
        No builds yet — push a branch to start one.
      </span>
    ),
  },
};

/**
 * `getRowId` controls the React key and, with `getRowProps`, lets rows carry a
 * stable DOM id for in-page anchors.
 */
export const WithRowIds: Story = {
  args: {
    columns: COLUMNS,
    data: DATA,
    getRowId: (original) => `build-${original.id}`,
    getRowProps: (row) => ({ id: row.id }),
  },
};
