import type { ExportedSymbol } from '../data/data.view-models';

/** Stable identity for a symbol, used for selection + React keys. */
export const symbolKey = (symbol: ExportedSymbol): string => {
  return `${symbol.path}|${symbol.line}|${symbol.name}|${symbol.isDefault}`;
};
