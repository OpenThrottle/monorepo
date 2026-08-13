import { describe, expect, test } from 'vitest';
import { parsePersonasDate } from '../parsers';

describe('parsePersonasDate', () => {
  test('returns the input value unchanged', () => {
    expect(parsePersonasDate('2026-08-12')).toBe('2026-08-12');
  });

  test('returns an empty string unchanged', () => {
    expect(parsePersonasDate('')).toBe('');
  });
});
