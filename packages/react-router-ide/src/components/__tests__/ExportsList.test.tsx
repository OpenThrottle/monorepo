import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ExportsList } from '../ExportsList';
import type { ExportedSymbol, IdeExportsResult } from '../../data/view-models';

const repository = { displayName: 'Repo One', repositoryId: 'r1' };

const symbols: ExportedSymbol[] = [
  {
    isDefault: false,
    kind: 'function',
    line: 5,
    name: 'alpha',
    path: 'src/a.ts',
  },
  { isDefault: true, kind: 'class', line: 9, name: 'Beta', path: 'src/b.ts' },
];

const result: IdeExportsResult = { repository, symbols, truncated: false };

describe('ExportsList Component', () => {
  let component: RenderResult;

  test('renders a loading skeleton state', () => {
    component = render(
      <ExportsList
        loading={true}
        result={{ repository, symbols: [], truncated: false }}
      />,
    );

    expect(component.getByTestId('ExportsList')).toBeInTheDocument();
    expect(component.queryByTestId('SymbolRow')).not.toBeInTheDocument();
  });

  test('renders an empty state when there are no exports', () => {
    component = render(
      <ExportsList result={{ repository, symbols: [], truncated: false }} />,
    );

    expect(component.getByText('No exports')).toBeInTheDocument();
  });

  test('renders a row per symbol grouped by path', () => {
    component = render(<ExportsList result={result} />);

    expect(component.getAllByTestId('SymbolRow')).toHaveLength(2);
    expect(component.getByText('src/a.ts')).toBeInTheDocument();
    expect(component.getByText('src/b.ts')).toBeInTheDocument();
  });

  test('fires onSelectSymbol when a symbol is chosen', async () => {
    const user = userEvent.setup();
    const onSelectSymbol = vi.fn();
    component = render(
      <ExportsList onSelectSymbol={onSelectSymbol} result={result} />,
    );

    await user.click(component.getByText('alpha'));

    expect(onSelectSymbol).toHaveBeenCalledWith(symbols[0]);
  });

  test('shows a truncation note when symbols were capped', () => {
    component = render(<ExportsList result={{ ...result, truncated: true }} />);

    expect(component.getByText(/Symbols truncated/)).toBeInTheDocument();
  });
});
