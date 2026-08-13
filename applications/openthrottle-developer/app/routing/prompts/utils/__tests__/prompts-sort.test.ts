import { describe, expect, test } from 'vitest';
import { isPromptsSortBy, isPromptsSortOrder } from '../prompts-sort';

describe('isPromptsSortBy', () => {
  test('accepts createdAt, title, and updatedAt', () => {
    expect(isPromptsSortBy('createdAt')).toBe(true);
    expect(isPromptsSortBy('title')).toBe(true);
    expect(isPromptsSortBy('updatedAt')).toBe(true);
  });

  test('rejects an unrecognized value', () => {
    expect(isPromptsSortBy('name')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isPromptsSortBy('')).toBe(false);
  });
});

describe('isPromptsSortOrder', () => {
  test('accepts asc and desc', () => {
    expect(isPromptsSortOrder('asc')).toBe(true);
    expect(isPromptsSortOrder('desc')).toBe(true);
  });

  test('rejects an unrecognized value', () => {
    expect(isPromptsSortOrder('ascending')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isPromptsSortOrder('')).toBe(false);
  });
});
