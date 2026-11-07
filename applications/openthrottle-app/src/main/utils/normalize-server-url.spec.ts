import { describe, expect, it } from 'vitest';

import { normalizeServerUrl } from './normalize-server-url.ts';

describe('normalizeServerUrl', () => {
  it.each([
    ['http://localhost:6021', 'http://localhost:6021'],
    ['http://localhost:6021/', 'http://localhost:6021'],
    ['  https://ot.example.com/graphql?x=1#h ', 'https://ot.example.com'],
    ['HTTP://127.0.0.1:6021', 'http://127.0.0.1:6021'],
  ])('reduces %s to its origin', (input, expected) => {
    expect(normalizeServerUrl(input)).toEqual({ ok: true, url: expected });
  });

  it.each([
    ['not a url'],
    [''],
    ['   '],
    ['ftp://example.com'],
    ['file:///etc/passwd'],
    ['javascript:alert(1)'],
    ['http://user:pass@example.com'],
    [`http://example.com/${'a'.repeat(3000)}`],
  ])('rejects %s', (input) => {
    expect(normalizeServerUrl(input).ok).toBe(false);
  });

  it.each([[undefined], [null], [42], [{}], [['http://a.com']]])(
    'rejects the non-string %s',
    (input) => {
      expect(normalizeServerUrl(input).ok).toBe(false);
    },
  );
});
