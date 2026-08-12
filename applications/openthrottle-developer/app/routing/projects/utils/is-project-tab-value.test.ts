import { describe, expect, test } from 'vitest';
import { isProjectTabValue } from './is-project-tab-value';

describe('isProjectTabValue', () => {
  test('accepts each known project tab value', () => {
    expect(isProjectTabValue('overview')).toBe(true);
    expect(isProjectTabValue('tasks')).toBe(true);
  });

  test('rejects an unknown tab value', () => {
    expect(isProjectTabValue('settings')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isProjectTabValue('')).toBe(false);
  });
});
