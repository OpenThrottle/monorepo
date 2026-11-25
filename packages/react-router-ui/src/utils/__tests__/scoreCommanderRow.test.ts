import { describe, expect, test } from 'vitest';

import { COMMANDER_ESCAPE_ROW_KEYWORD } from '../../data/commander';
import { scoreCommanderRow } from '../scoreCommanderRow';

describe('scoreCommanderRow', () => {
  test('ranks escape rows leading > search > fallback', () => {
    const leading = scoreCommanderRow('x', 'argo', [
      COMMANDER_ESCAPE_ROW_KEYWORD.leading,
    ]);
    const search = scoreCommanderRow('x', 'argo', [
      COMMANDER_ESCAPE_ROW_KEYWORD.search,
    ]);
    const fallback = scoreCommanderRow('argo browse', 'argo', [
      COMMANDER_ESCAPE_ROW_KEYWORD.fallback,
    ]);

    expect(leading).toBeGreaterThan(search);
    expect(search).toBeGreaterThan(fallback);
    expect(fallback).toBeGreaterThan(0);
  });

  test('keeps escape rows below any genuine match', () => {
    const match = scoreCommanderRow('plans', 'pla', undefined);
    const leading = scoreCommanderRow('x', 'pla', [
      COMMANDER_ESCAPE_ROW_KEYWORD.leading,
    ]);

    expect(match).toBeGreaterThan(leading);
  });

  test('falls back to the default score for unmarked rows', () => {
    expect(scoreCommanderRow('plans', 'zzz', undefined)).toBe(0);
  });
});
