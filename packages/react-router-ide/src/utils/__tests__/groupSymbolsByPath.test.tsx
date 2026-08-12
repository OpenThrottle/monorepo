import { describe, expect, test } from 'vitest';
import { groupSymbolsByPath } from '../groupSymbolsByPath';
import type { ExportedSymbol } from '../../data/view-models';

const alpha: ExportedSymbol = {
  isDefault: false,
  kind: 'function',
  line: 5,
  name: 'alpha',
  path: 'src/b.ts',
};

const beta: ExportedSymbol = {
  isDefault: true,
  kind: 'class',
  line: 9,
  name: 'Beta',
  path: 'src/a.ts',
};

const gamma: ExportedSymbol = {
  isDefault: false,
  kind: 'const',
  line: 1,
  name: 'gamma',
  path: 'src/b.ts',
};

describe('groupSymbolsByPath', () => {
  test('returns an empty array for no symbols', () => {
    expect(groupSymbolsByPath([])).toEqual([]);
  });

  test('groups a single symbol into a single-path group', () => {
    expect(groupSymbolsByPath([alpha])).toEqual([
      { path: 'src/b.ts', symbols: [alpha] },
    ]);
  });

  test('groups multiple symbols by their declaring path, sorted by path', () => {
    const result = groupSymbolsByPath([alpha, beta, gamma]);

    expect(result).toEqual([
      { path: 'src/a.ts', symbols: [beta] },
      { path: 'src/b.ts', symbols: [alpha, gamma] },
    ]);
  });

  test('preserves original order of symbols within a path group', () => {
    const result = groupSymbolsByPath([alpha, gamma]);

    expect(result).toEqual([{ path: 'src/b.ts', symbols: [alpha, gamma] }]);
  });
});
