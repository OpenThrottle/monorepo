import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SymbolRow } from '../SymbolRow';
import type { ExportedSymbol } from '../../data/view-models';

const symbol: ExportedSymbol = {
  isDefault: false,
  kind: 'function',
  line: 42,
  name: 'searchText',
  path: 'src/data/search.ts',
};

describe('SymbolRow Component', () => {
  let component: RenderResult;

  test('renders the symbol name, kind, and line', () => {
    component = render(<SymbolRow symbol={symbol} />);

    expect(component.getByText('searchText')).toBeInTheDocument();
    expect(component.getByText('function')).toBeInTheDocument();
    expect(component.getByText(':42')).toBeInTheDocument();
  });

  test('shows a default-export indicator only when isDefault', () => {
    component = render(<SymbolRow symbol={symbol} />);
    expect(component.queryByText('default')).not.toBeInTheDocument();

    component.rerender(<SymbolRow symbol={{ ...symbol, isDefault: true }} />);
    expect(component.getByText('default')).toBeInTheDocument();
  });

  test('fires onSelect with the symbol when activated', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    component = render(<SymbolRow onSelect={onSelect} symbol={symbol} />);

    await user.click(component.getByTestId('SymbolRow'));

    expect(onSelect).toHaveBeenCalledWith(symbol);
  });

  test('reflects the selected state via aria-pressed', () => {
    component = render(<SymbolRow selected={true} symbol={symbol} />);

    expect(component.getByTestId('SymbolRow')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
