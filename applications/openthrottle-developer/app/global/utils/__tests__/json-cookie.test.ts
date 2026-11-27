import { describe, expect, test } from 'vitest';

import { readJsonCookie, serializeJsonCookie } from '../json-cookie';

describe('readJsonCookie', () => {
  test('reads back what serializeJsonCookie wrote, among other cookies', () => {
    const value = { items: ['a', 'b;c'], open: true };
    const pair = serializeJsonCookie('ot_test', value).split(';')[0] ?? '';

    expect(readJsonCookie(`theme=dark; ${pair}; other=1`, 'ot_test')).toEqual(
      value,
    );
  });

  describe('yields undefined', () => {
    test('when the cookie is absent', () => {
      expect(readJsonCookie('theme=dark', 'ot_test')).toBeUndefined();
      expect(readJsonCookie('', 'ot_test')).toBeUndefined();
    });

    test('when the value is not valid JSON', () => {
      expect(readJsonCookie('ot_test=%7Bnope', 'ot_test')).toBeUndefined();
    });

    test('when the value is not valid URI encoding', () => {
      expect(readJsonCookie('ot_test=%E0%A4%A', 'ot_test')).toBeUndefined();
    });
  });

  test('does not match a cookie whose name merely starts with the name', () => {
    expect(readJsonCookie('ot_test_other=1', 'ot_test')).toBeUndefined();
  });
});

describe('serializeJsonCookie', () => {
  test('writes an encoded value with a one-year, lax, root-path cookie', () => {
    expect(serializeJsonCookie('ot_test', { a: 1 })).toBe(
      `ot_test=${encodeURIComponent('{"a":1}')}; path=/; max-age=31536000; samesite=lax`,
    );
  });
});
