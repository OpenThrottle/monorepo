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

const makeConsumer =
  (options: { endpoint: string; symbol: ExportedSymbol }) =>
  (): React.ReactElement => {
    const {
      details: resolved,
      loading,
      selectSymbol,
    } = useSymbolDetails({ endpoint: options.endpoint });

    return (
      <div>
        <button onClick={() => selectSymbol(options.symbol)} type="button">
          load
        </button>
        <span data-testid="loading">{loading ? 'loading' : 'idle'}</span>
        {resolved ? (
          <span data-testid="name">{resolved.symbol.name}</span>
        ) : null}
      </div>
    );
  };

const Consumer = makeConsumer({ endpoint: '/ide/symbol', symbol });

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

  test('reflects the in-flight loading flag and returns to idle', async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const RoutesStub = createRoutesStub([
      { Component: Consumer, path: '/' },
      {
        loader: async () => {
          await gate;

          return details;
        },
        path: '/ide/symbol',
      },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('loading')).toHaveTextContent('idle');

    await user.click(component.getByRole('button', { name: 'load' }));

    await waitFor(() => {
      expect(component.getByTestId('loading')).toHaveTextContent('loading');
    });

    release?.();

    await waitFor(() => {
      expect(component.getByTestId('loading')).toHaveTextContent('idle');
    });
    expect(component.getByTestId('name')).toHaveTextContent('searchText');
  });

  test('uses `&` when the endpoint already carries a query string', async () => {
    const user = userEvent.setup();
    let loadedUrl: string | undefined;
    const EndpointConsumer = makeConsumer({
      endpoint: '/ide/symbol?repo=r1',
      symbol,
    });
    const RoutesStub = createRoutesStub([
      { Component: EndpointConsumer, path: '/' },
      {
        loader: ({ request }) => {
          loadedUrl = request.url;

          return details;
        },
        path: '/ide/symbol',
      },
    ]);
    const component = render(<RoutesStub />);

    await user.click(component.getByRole('button', { name: 'load' }));

    await waitFor(() => {
      expect(loadedUrl).toBeDefined();
    });
    const params = new URL(loadedUrl ?? '').searchParams;
    expect(params.get('repo')).toBe('r1');
    expect(params.get('name')).toBe('searchText');
    expect(params.get('path')).toBe('src/data/search.ts');
    expect(params.get('line')).toBe('42');
  });

  test('encodes symbol name/path containing URL-significant characters', async () => {
    const user = userEvent.setup();
    const trickySymbol: ExportedSymbol = {
      isDefault: false,
      kind: 'function',
      line: 7,
      name: 'a&b=c?d',
      path: 'src/my dir/a#b.ts',
    };
    let loadedUrl: string | undefined;
    const TrickyConsumer = makeConsumer({
      endpoint: '/ide/symbol',
      symbol: trickySymbol,
    });
    const RoutesStub = createRoutesStub([
      { Component: TrickyConsumer, path: '/' },
      {
        loader: ({ request }) => {
          loadedUrl = request.url;

          return details;
        },
        path: '/ide/symbol',
      },
    ]);
    const component = render(<RoutesStub />);

    await user.click(component.getByRole('button', { name: 'load' }));

    await waitFor(() => {
      expect(loadedUrl).toBeDefined();
    });
    // The raw query string must percent-encode the significant characters so a
    // `&`/`?`/`#` inside a value can't split or truncate the params.
    const rawQuery = (loadedUrl ?? '').split('?')[1] ?? '';
    expect(rawQuery).toContain('name=a%26b%3Dc%3Fd');
    expect(rawQuery).toContain('path=src%2Fmy+dir%2Fa%23b.ts');
    // And decoding round-trips back to the exact symbol fields.
    const params = new URL(loadedUrl ?? '').searchParams;
    expect(params.get('name')).toBe('a&b=c?d');
    expect(params.get('path')).toBe('src/my dir/a#b.ts');
  });
});
