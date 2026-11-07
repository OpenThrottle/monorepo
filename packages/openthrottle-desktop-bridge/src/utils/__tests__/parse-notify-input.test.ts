import { describe, expect, test } from 'vitest';

import { parseNotifyInput } from '../parse-notify-input.ts';

describe('parseNotifyInput', () => {
  test('accepts a title, body and link', () => {
    expect(
      parseNotifyInput({ body: 'b', link: '/plans/x', title: 't' }),
    ).toEqual({ input: { body: 'b', link: '/plans/x', title: 't' }, ok: true });
  });

  test('defaults a missing body and link', () => {
    expect(parseNotifyInput({ title: 't' })).toEqual({
      input: { body: '', link: undefined, title: 't' },
      ok: true,
    });
  });

  test.each([
    ['null', null],
    ['a string', 'x'],
    ['no title', { body: 'b' }],
    ['a blank title', { title: '  ' }],
    ['an oversized title', { title: 'x'.repeat(513) }],
    ['an oversized body', { body: 'x'.repeat(513), title: 't' }],
  ])('rejects %s', (_label, value) => {
    expect(parseNotifyInput(value).ok).toBe(false);
  });
});
