import { describe, expect, test } from 'vitest';
import { normalizeSource } from './search-card';

describe('normalizeSource', () => {
  test('returns "task" unchanged', () => {
    expect(normalizeSource('task')).toBe('task');
  });

  test('returns "documentation" unchanged', () => {
    expect(normalizeSource('documentation')).toBe('documentation');
  });

  test('falls back to "plan" for the "plan" source', () => {
    expect(normalizeSource('plan')).toBe('plan');
  });

  test('falls back to "plan" for an unrecognized source', () => {
    expect(normalizeSource('everything')).toBe('plan');
  });

  test('falls back to "plan" for an empty string', () => {
    expect(normalizeSource('')).toBe('plan');
  });
});
