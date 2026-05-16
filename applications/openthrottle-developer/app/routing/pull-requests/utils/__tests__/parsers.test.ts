import { describe, expect, test } from 'vitest';
import { parsePullListState, parsePullRequestsDate } from '../parsers';

describe('parsePullRequestsDate', () => {
  test('returns the input string unchanged', () => {
    expect(parsePullRequestsDate('2026-01-01')).toBe('2026-01-01');
  });
});

describe('parsePullListState', () => {
  test('returns open for null', () => {
    expect(parsePullListState(null)).toBe('open');
  });

  test('returns open for empty string', () => {
    expect(parsePullListState('')).toBe('open');
  });

  test('returns open for unrecognized value', () => {
    expect(parsePullListState('draft')).toBe('open');
  });

  test('returns all when raw is all', () => {
    expect(parsePullListState('all')).toBe('all');
  });

  test('returns closed when raw is closed', () => {
    expect(parsePullListState('closed')).toBe('closed');
  });
});
