import { describe, expect, it } from 'vitest';

import { decideWindowOpen } from './decideWindowOpen.ts';

describe('decideWindowOpen', () => {
  it('opens http(s) targets externally, same-origin included', () => {
    expect(decideWindowOpen('https://example.com/a')).toEqual({
      kind: 'external',
      url: 'https://example.com/a',
    });
    expect(decideWindowOpen('http://127.0.0.1:5123/health')).toEqual({
      kind: 'external',
      url: 'http://127.0.0.1:5123/health',
    });
  });

  it('denies everything else', () => {
    expect(decideWindowOpen('mailto:a@b.co')).toEqual({ kind: 'deny' });
    expect(decideWindowOpen('about:blank')).toEqual({ kind: 'deny' });
    expect(decideWindowOpen('javascript:alert(1)')).toEqual({ kind: 'deny' });
    expect(decideWindowOpen('')).toEqual({ kind: 'deny' });
  });
});
