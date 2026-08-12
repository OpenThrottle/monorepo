import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { LocationTable } from '../LocationTable';
import type {
  DefinitionLocation,
  ReferenceLocation,
} from '../../data/view-models';

const definitions: DefinitionLocation[] = [
  {
    column: 3,
    kind: 'function',
    line: 10,
    name: 'searchText',
    path: 'src/a.ts',
  },
  { column: 1, kind: 'class', line: 22, name: 'Widget', path: 'src/b.ts' },
];

const references: ReferenceLocation[] = [
  { column: 5, isWrite: true, line: 7, path: 'src/c.ts' },
  { column: 9, isWrite: false, line: 14, path: 'src/d.ts' },
];

describe('LocationTable Component', () => {
  let component: RenderResult;

  test('renders an empty state when rows is empty', () => {
    component = render(<LocationTable rows={[]} />);

    expect(component.getByText('No locations.')).toBeInTheDocument();
    expect(component.queryByRole('table')).not.toBeInTheDocument();
  });

  test('renders a row per location with path and line:column', () => {
    component = render(<LocationTable rows={definitions} />);

    expect(component.getByRole('table')).toBeInTheDocument();
    expect(component.getAllByRole('row')).toHaveLength(3); // header + 2 rows
    expect(component.getByText('src/a.ts')).toBeInTheDocument();
    expect(component.getByText('10:3')).toBeInTheDocument();
    expect(component.getByText('src/b.ts')).toBeInTheDocument();
    expect(component.getByText('22:1')).toBeInTheDocument();
  });

  test('shows a write badge only for reference rows with isWrite true', () => {
    component = render(<LocationTable rows={references} />);

    expect(component.getByText('write')).toBeInTheDocument();
    expect(component.getAllByText('write')).toHaveLength(1);
    expect(component.getByText('src/c.ts')).toBeInTheDocument();
    expect(component.getByText('7:5')).toBeInTheDocument();
    expect(component.getByText('src/d.ts')).toBeInTheDocument();
    expect(component.getByText('14:9')).toBeInTheDocument();
  });

  test('does not show a write badge for definition rows (no isWrite field)', () => {
    component = render(<LocationTable rows={definitions} />);

    expect(component.queryByText('write')).not.toBeInTheDocument();
  });
});
