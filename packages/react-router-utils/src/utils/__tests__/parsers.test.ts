import { describe, expect, test } from 'vitest';
import { parseShortUUID } from '../parsers';

describe('parseShortUUID', () => {
  test('returns an empty string for undefined', () => {
    expect(parseShortUUID(undefined)).toBe('');
  });

  test('returns an empty string for null', () => {
    expect(parseShortUUID(null as unknown as string)).toBe('');
  });

  test('returns an empty string for an empty string', () => {
    expect(parseShortUUID('')).toBe('');
  });

  test('returns the input unchanged when shorter than 8 characters', () => {
    expect(parseShortUUID('abc')).toBe('abc');
    expect(parseShortUUID('1234567')).toBe('1234567');
  });

  test('returns the full string when exactly 8 characters', () => {
    expect(parseShortUUID('12345678')).toBe('12345678');
  });

  test('returns the first 8 characters when longer than 8', () => {
    expect(parseShortUUID('502df2f0-64e9-481b-b378-75587e675ef3')).toBe(
      '502df2f0',
    );
  });
});
