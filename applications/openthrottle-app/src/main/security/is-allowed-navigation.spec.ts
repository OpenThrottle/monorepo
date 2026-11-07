import { describe, expect, it } from 'vitest';

import { isAllowedNavigation } from './is-allowed-navigation.ts';

const ORIGINS = ['http://127.0.0.1:5123'];

describe('isAllowedNavigation', () => {
  it('allows any path on an allowed origin', () => {
    expect(
      isAllowedNavigation('http://127.0.0.1:5123/plans?x=1#a', ORIGINS),
    ).toBe(true);
  });

  it('follows a changed origin list', () => {
    expect(isAllowedNavigation('http://127.0.0.1:6000/', ORIGINS)).toBe(false);
    expect(
      isAllowedNavigation('http://127.0.0.1:6000/', ['http://127.0.0.1:6000']),
    ).toBe(true);
  });

  it('rejects other origins, including look-alikes', () => {
    expect(isAllowedNavigation('https://example.com/', ORIGINS)).toBe(false);
    expect(isAllowedNavigation('https://127.0.0.1:5123/', ORIGINS)).toBe(false);
    expect(
      isAllowedNavigation('http://127.0.0.1:5123.evil.test/', ORIGINS),
    ).toBe(false);
    expect(
      isAllowedNavigation('http://127.0.0.1:5123@evil.test/', ORIGINS),
    ).toBe(false);
  });

  it('rejects non-http schemes and unparseable input', () => {
    expect(isAllowedNavigation('data:text/html,hi', ORIGINS)).toBe(false);
    expect(isAllowedNavigation('file:///etc/passwd', ORIGINS)).toBe(false);
    expect(isAllowedNavigation('javascript:alert(1)', ORIGINS)).toBe(false);
    expect(isAllowedNavigation('not a url', ORIGINS)).toBe(false);
  });

  it('allows nothing when no origin is known yet', () => {
    expect(isAllowedNavigation('http://127.0.0.1:5123/', [])).toBe(false);
  });
});
