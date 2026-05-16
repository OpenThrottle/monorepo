import { describe, expect, test } from 'vitest';
import { isSortBy, isSortOrder, isView } from '../projects';

describe('isSortBy', () => {
  test('returns true for valid sort keys', () => {
    expect(isSortBy('name')).toBe(true);
    expect(isSortBy('createdAt')).toBe(true);
    expect(isSortBy('updatedAt')).toBe(true);
  });

  test('returns false for invalid strings', () => {
    expect(isSortBy('title')).toBe(false);
    expect(isSortBy('')).toBe(false);
    expect(isSortBy('created_at')).toBe(false);
  });
});

describe('isSortOrder', () => {
  test('returns true for asc and desc', () => {
    expect(isSortOrder('asc')).toBe(true);
    expect(isSortOrder('desc')).toBe(true);
  });

  test('returns false for invalid strings', () => {
    expect(isSortOrder('ASC')).toBe(false);
    expect(isSortOrder('')).toBe(false);
  });
});

describe('isView', () => {
  test('returns true for table and card', () => {
    expect(isView('table')).toBe(true);
    expect(isView('card')).toBe(true);
  });

  test('returns false for invalid strings', () => {
    expect(isView('list')).toBe(false);
    expect(isView('')).toBe(false);
  });
});
