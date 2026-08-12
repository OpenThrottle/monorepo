import { describe, expect, test } from 'vitest';
import { symbolKey } from '../symbolKey';
import type { ExportedSymbol } from '../../data/view-models';

describe('symbolKey', () => {
  test('builds a stable pipe-delimited key from path, line, name, and isDefault', () => {
    const symbol: ExportedSymbol = {
      isDefault: false,
      kind: 'function',
      line: 42,
      name: 'searchText',
      path: 'src/data/search.ts',
    };

    expect(symbolKey(symbol)).toBe('src/data/search.ts|42|searchText|false');
  });

  test('includes isDefault=true in the key', () => {
    const symbol: ExportedSymbol = {
      isDefault: true,
      kind: 'class',
      line: 9,
      name: 'Beta',
      path: 'src/b.ts',
    };

    expect(symbolKey(symbol)).toBe('src/b.ts|9|Beta|true');
  });

  test('produces distinct keys for symbols differing only by line', () => {
    const base: ExportedSymbol = {
      isDefault: false,
      kind: 'const',
      line: 1,
      name: 'gamma',
      path: 'src/b.ts',
    };
    const other: ExportedSymbol = { ...base, line: 2 };

    expect(symbolKey(base)).not.toBe(symbolKey(other));
  });

  test('produces the same key for structurally identical symbols', () => {
    const a: ExportedSymbol = {
      isDefault: false,
      kind: 'function',
      line: 5,
      name: 'alpha',
      path: 'src/a.ts',
    };
    const b: ExportedSymbol = { ...a };

    expect(symbolKey(a)).toBe(symbolKey(b));
  });
});
