import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge';
import { Table } from './Table';
import { TableBody } from './TableBody';
import { TableCaption } from './TableCaption';
import { TableCell } from './TableCell';
import { TableFooter } from './TableFooter';
import { TableHead } from './TableHead';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';

const ROWS = [
  { build: '4821', duration: '2m 14s', status: 'passed' },
  { build: '4820', duration: '2m 02s', status: 'passed' },
  { build: '4819', duration: '0m 48s', status: 'failed' },
  { build: '4818', duration: '2m 31s', status: 'passed' },
] as const;

const meta = {
  component: Table,
  parameters: { controls: { disable: true } },
  title: 'Components/Table',
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The unstyled primitive family — thin wrappers over the native table
 * elements. For anything column-driven, reach for `DataTable` instead; this is
 * the layer it is built on.
 */
export const Default: Story = {
  render: () => (
    <Table className="w-[32rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Build</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.build}>
            <TableCell className="font-medium">{row.build}</TableCell>
            <TableCell>
              <Badge color={row.status === 'passed' ? 'green' : 'red'}>
                {row.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{row.duration}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** `TableCaption` and `TableFooter` — the two parts most often forgotten. */
export const WithCaptionAndFooter: Story = {
  render: () => (
    <Table className="w-[32rem]">
      <TableCaption>Builds from the last hour.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Build</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.build}>
            <TableCell className="font-medium">{row.build}</TableCell>
            <TableCell className="text-right">{row.duration}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right">7m 35s</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

/** A selected row is expressed with `data-state`, not a prop. */
export const SelectedRow: Story = {
  render: () => (
    <Table className="w-[32rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Build</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row, index) => (
          <TableRow
            data-state={index === 1 ? 'selected' : undefined}
            key={row.build}
          >
            <TableCell className="font-medium">{row.build}</TableCell>
            <TableCell className="text-right">{row.duration}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
