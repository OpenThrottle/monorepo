import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useSymbolDetails } from '../useSymbolDetails';
import type { ExportedSymbol, IdeSymbolDetails } from '../../data/view-models';

const symbol: ExportedSymbol = {
  isDefault: false,
  kind: 'function',
  line: 42,
  name: 'searchText',
  path: 'src/data/search.ts',
};

const details: IdeSymbolDetails = {
  definitions: [{ column: 1, line: 42, path: 'src/data/search.ts' }],
  references: [{ column: 3, line: 10, path: 'src/a.ts' }],
  repository: { displayName: 'Repo One', repositoryId: 'r1' },
  symbol: { line: 42, name: 'searchText', path: 'src/data/search.ts' },
};

const Consumer = (): React.ReactElement => {
  const { details: resolved, selectSymbol } = useSymbolDetails({
    endpoint: '/ide/symbol',
  });

  return (
    <div>
      <button onClick={() => selectSymbol(symbol)} type="button">
        load
      </button>
      {resolved ? <span data-testid="name">{resolved.symbol.name}</span> : null}
    </div>
  );
};

describe('useSymbolDetails', () => {
  test('loads definition/references via the resource route', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      { Component: Consumer, path: '/' },
      { loader: () => details, path: '/ide/symbol' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.queryByTestId('name')).not.toBeInTheDocument();

    await user.click(component.getByRole('button', { name: 'load' }));

    await waitFor(() => {
      expect(component.getByTestId('name')).toHaveTextContent('searchText');
    });
  });
});
