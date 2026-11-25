import { describe, expect, it } from 'vitest';

import { redactSecrets } from '../redactSecrets.ts';

describe('redactSecrets', () => {
  it('replaces every occurrence of each secret', () => {
    expect(
      redactSecrets('a token-12345678 b token-12345678 c secret-abcdefgh', [
        'token-12345678',
        'secret-abcdefgh',
      ]),
    ).toBe('a [redacted] b [redacted] c [redacted]');
  });

  it('ignores undefined and short values', () => {
    expect(redactSecrets('the cat sat', [undefined, 'cat'])).toBe(
      'the cat sat',
    );
  });

  it('masks the longer secret first when one contains another', () => {
    expect(redactSecrets('abcdefgh-ijkl', ['abcdefgh', 'abcdefgh-ijkl'])).toBe(
      '[redacted]',
    );
  });
});
