import { describe, expect, test } from 'vitest';
import {
  PROJECTS_SORT_OPTIONS,
  SORT_BY_OPTIONS,
  SORT_BY_VALUES,
  SORT_ORDER_OPTIONS,
  SORT_ORDER_VALUES,
  VIEW_VALUES,
} from '../index';

describe('routing/projects config index', () => {
  test('SORT_BY_VALUES matches SORT_BY_OPTIONS values', () => {
    const fromOptions = SORT_BY_OPTIONS.map((o) => o.value);
    expect([...SORT_BY_VALUES]).toEqual(fromOptions);
  });

  test('SORT_ORDER_VALUES matches SORT_ORDER_OPTIONS values', () => {
    const fromOptions = SORT_ORDER_OPTIONS.map((o) => o.value);
    expect([...SORT_ORDER_VALUES]).toEqual(fromOptions);
  });

  test('PROJECTS_SORT_OPTIONS has expected combined values', () => {
    expect(PROJECTS_SORT_OPTIONS.length).toBeGreaterThanOrEqual(6);
    const values = PROJECTS_SORT_OPTIONS.map((o) => o.value);
    expect(values).toContain('createdAt-desc');
    expect(values).toContain('name-asc');
  });

  test('VIEW_VALUES lists supported layouts', () => {
    expect([...VIEW_VALUES]).toEqual(['table', 'card']);
  });
});
