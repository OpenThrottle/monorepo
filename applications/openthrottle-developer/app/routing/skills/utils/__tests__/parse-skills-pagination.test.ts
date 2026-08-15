import { describe, expect, test } from 'vitest';
import {
  parsePaginationLimit,
  parsePaginationPage,
} from '../parse-skills-pagination';

describe('parsePaginationPage', () => {
  test('parses a valid page number', () => {
    expect(parsePaginationPage('3')).toBe(3);
  });

  test('floors fractional pages', () => {
    expect(parsePaginationPage('2.9')).toBe(2);
  });

  test.each([null, '', 'abc', '0', '-1'])(
    'falls back to page 1 for %p',
    (raw) => {
      expect(parsePaginationPage(raw)).toBe(1);
    },
  );
});

describe('parsePaginationLimit', () => {
  test('parses a valid limit', () => {
    expect(parsePaginationLimit('10')).toBe(10);
  });

  test.each([null, '', 'abc', '0', '-5'])(
    'falls back to the default limit for %p',
    (raw) => {
      expect(parsePaginationLimit(raw)).toBe(25);
    },
  );
});
