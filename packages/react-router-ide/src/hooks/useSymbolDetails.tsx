import { useCallback } from 'react';
import { useFetcher } from 'react-router';
import type { ExportedSymbol, IdeSymbolDetails } from '../data/view-models';

export interface UseSymbolDetailsOptions {
  /** The resource-route path that resolves a symbol's definition + references. */
  endpoint: string;
}

export interface UseSymbolDetailsResult {
  /** The resolved details, or undefined before any symbol has been selected. */
  details: IdeSymbolDetails | undefined;
  /** True while the def/references resource route is in flight. */
  loading: boolean;
  /** Resolve definition + references for a symbol via the resource route. */
  selectSymbol: (symbol: ExportedSymbol) => void;
}

/**
 * Wrap a React Router `fetcher` for the symbol definition/references resource
 * route. The app supplies the route path (kept generic); `selectSymbol` issues a
 * GET with the symbol's `path`/`line`/`name` as search params. This is the only
 * fetcher in the package — text search is a GET `?q=` → loader round-trip instead.
 *
 * @public
 */
export const useSymbolDetails = (
  options: UseSymbolDetailsOptions,
): UseSymbolDetailsResult => {
  const { endpoint } = options;

  // Hooks
  const fetcher = useFetcher<IdeSymbolDetails>();

  // Setup

  // Handlers
  const selectSymbol = useCallback(
    (symbol: ExportedSymbol): void => {
      const params = new URLSearchParams({
        line: String(symbol.line),
        name: symbol.name,
        path: symbol.path,
      });
      const separator = endpoint.includes('?') ? '&' : '?';

      fetcher.load(`${endpoint}${separator}${params.toString()}`);
    },
    [endpoint, fetcher],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return {
    details: fetcher.data,
    loading: fetcher.state !== 'idle',
    selectSymbol,
  };
};
