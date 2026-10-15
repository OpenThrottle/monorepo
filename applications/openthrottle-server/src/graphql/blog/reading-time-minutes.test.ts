import { describe, expect, test } from 'vitest';

import { readingTimeMinutes } from './reading-time-minutes.ts';

const words = (count: number): string => Array(count).fill('word').join(' ');

describe('readingTimeMinutes', () => {
  describe('when the body is empty or whitespace', () => {
    test('returns the 1 minute minimum', () => {
      expect(readingTimeMinutes('')).toBe(1);
      expect(readingTimeMinutes('  \n\t ')).toBe(1);
    });
  });

  describe('when the body is short', () => {
    test('returns 1 for a single word', () => {
      expect(readingTimeMinutes('hello')).toBe(1);
    });
  });

  describe('at the 200 words-per-minute boundary', () => {
    test('returns 1 for exactly 200 words', () => {
      expect(readingTimeMinutes(words(200))).toBe(1);
    });

    test('rounds up to 2 for 201 words', () => {
      expect(readingTimeMinutes(words(201))).toBe(2);
    });

    test('returns 3 for 450 words', () => {
      expect(readingTimeMinutes(words(450))).toBe(3);
    });
  });

  describe('when words are separated by mixed whitespace', () => {
    test('counts newlines and repeated spaces as single separators', () => {
      expect(readingTimeMinutes(`${words(200)}\n\n   ${words(1)}`)).toBe(2);
    });
  });
});
