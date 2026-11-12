import { describe, expect, it } from 'vitest';

import { decideNavigation } from './decideNavigation.ts';

const ORIGINS = ['http://127.0.0.1:5123'];

describe('decideNavigation', () => {
  it('allows the app origin', () => {
    expect(decideNavigation('http://127.0.0.1:5123/auth', ORIGINS)).toEqual({
      kind: 'allow',
    });
  });

  it('sends foreign http(s) to the system browser', () => {
    expect(decideNavigation('https://example.com', ORIGINS)).toEqual({
      kind: 'external',
      url: 'https://example.com/',
    });
  });

  it('blocks everything else outright', () => {
    expect(decideNavigation('file:///etc/passwd', ORIGINS)).toEqual({
      kind: 'block',
    });
    expect(decideNavigation('data:text/html,hi', ORIGINS)).toEqual({
      kind: 'block',
    });
    expect(decideNavigation('mailto:a@b.co', ORIGINS)).toEqual({
      kind: 'block',
    });
  });
});
