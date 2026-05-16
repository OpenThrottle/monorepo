import { describe, expect, test } from 'vitest';
import { parseLegalDate } from '~/routing/legal/utils/parsers';

describe('routing/legal utils parsers', () => {
  test('parseLegalDate returns the input unchanged (placeholder)', () => {
    expect(parseLegalDate('2024-01-02')).toBe('2024-01-02');
    expect(parseLegalDate('')).toBe('');
  });
});
