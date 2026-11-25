import type { ExportedSymbol } from '../data/view-models';

/** Group symbols by their declaring file, with paths sorted. */
export const groupSymbolsByPath = (
  symbols: ExportedSymbol[],
): Array<{ path: string; symbols: ExportedSymbol[] }> => {
  const byPath = new Map<string, ExportedSymbol[]>();

  for (const symbol of symbols) {
    const existing = byPath.get(symbol.path);
    if (existing === undefined) {
      byPath.set(symbol.path, [symbol]);
    } else {
      existing.push(symbol);
    }
  }

  return [...byPath.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, group]) => ({ path, symbols: group }));
};
