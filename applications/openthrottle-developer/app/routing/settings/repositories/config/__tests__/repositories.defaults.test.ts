import { describe, expect, test } from 'vitest';
import {
  REPOSITORIES_DEFAULT_LIMIT,
  REPOSITORIES_DEFAULT_SORT_BY,
  REPOSITORIES_DEFAULT_SORT_ORDER,
  REPOSITORIES_SORT_BY,
  REPOSITORIES_SORT_OPTIONS,
  REPOSITORIES_SORT_ORDER,
  isRepositoriesSortBy,
  isRepositoriesSortOrder,
} from '../repositories.defaults';

describe('repositories.defaults', () => {
  test('exposes a positive default page size', () => {
    expect(REPOSITORIES_DEFAULT_LIMIT).toBeGreaterThan(0);
  });

  test('defaults fall inside the allowed values', () => {
    expect(REPOSITORIES_SORT_BY).toContain(REPOSITORIES_DEFAULT_SORT_BY);
    expect(REPOSITORIES_SORT_ORDER).toContain(REPOSITORIES_DEFAULT_SORT_ORDER);
  });

  test('every dropdown option is a valid sortBy-sortOrder pair', () => {
    for (const option of REPOSITORIES_SORT_OPTIONS) {
      const [sortBy, sortOrder] = option.value.split('-');

      expect(isRepositoriesSortBy(sortBy)).toBe(true);
      expect(isRepositoriesSortOrder(sortOrder)).toBe(true);
    }
  });

  test('guards reject unknown values', () => {
    expect(isRepositoriesSortBy('nope')).toBe(false);
    expect(isRepositoriesSortOrder('sideways')).toBe(false);
  });
});
