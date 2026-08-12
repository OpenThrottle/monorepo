import { describe, expect, test } from 'vitest';
import { isPlanTasksView, PLAN_TASKS_VIEW } from '../plan-tab-tasks-view';

describe('PLAN_TASKS_VIEW', () => {
  test('exposes the list and table modes', () => {
    expect(PLAN_TASKS_VIEW).toEqual({ list: 'list', table: 'table' });
  });
});

describe('isPlanTasksView', () => {
  test('accepts list', () => {
    expect(isPlanTasksView('list')).toBe(true);
  });

  test('accepts table', () => {
    expect(isPlanTasksView('table')).toBe(true);
  });

  test('rejects an unknown string', () => {
    expect(isPlanTasksView('grid')).toBe(false);
  });

  test('rejects non-string values', () => {
    expect(isPlanTasksView(undefined)).toBe(false);
    expect(isPlanTasksView(null)).toBe(false);
    expect(isPlanTasksView(42)).toBe(false);
  });
});
