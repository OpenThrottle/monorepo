import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../Table';

describe('Table', () => {
  it('renders table structure with header, body, and cells', () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Item 1</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
    expect(container.textContent).toContain('Name');
    expect(container.textContent).toContain('Item 1');
    expect(container.textContent).toContain('Active');
  });

  it('renders caption when provided', () => {
    const { container } = render(
      <Table>
        <TableCaption>A list of items.</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const caption = container.querySelector('caption');
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveTextContent('A list of items.');
  });

  it('renders footer when provided', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={1}>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const footer = container.querySelector('tfoot');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Total');
  });
});
