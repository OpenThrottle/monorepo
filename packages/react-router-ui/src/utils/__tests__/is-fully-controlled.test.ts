import { describe, expect, test } from 'vitest';
import { isFullyControlled } from '../is-fully-controlled';

describe('isFullyControlled', () => {
  test('returns true when both value and onValueChange are provided', () => {
    expect(isFullyControlled('one', () => undefined)).toBe(true);
  });

  test('returns false when value is undefined', () => {
    expect(isFullyControlled(undefined, () => undefined)).toBe(false);
  });

  test('returns false when onValueChange is undefined', () => {
    expect(isFullyControlled('one', undefined)).toBe(false);
  });

  test('returns false when both are undefined', () => {
    expect(isFullyControlled(undefined, undefined)).toBe(false);
  });
});
