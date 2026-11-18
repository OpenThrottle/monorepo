import { describe, expect, test } from 'vitest';

import {
  DEFAULT_REDIRECT_URL,
  getLoginHref,
  getLoginRedirectFromRequest,
  getRedirectUrlFromRequest,
  getSafeRedirect,
  REDIRECT_URL_PARAM,
} from '../redirect-url';

describe('getSafeRedirect', () => {
  test('keeps a same-origin path with its search', () => {
    expect(getSafeRedirect('/plans/abc?tab=tasks')).toBe(
      '/plans/abc?tab=tasks',
    );
  });

  test('falls back to /dashboard for anything that is not a path', () => {
    expect(getSafeRedirect(null)).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect(undefined)).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect('')).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect('plans/abc')).toBe(DEFAULT_REDIRECT_URL);
  });

  test('refuses absolute URLs and script schemes', () => {
    expect(getSafeRedirect('https://evil.test')).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect('javascript:alert(1)')).toBe(DEFAULT_REDIRECT_URL);
  });

  test('refuses protocol-relative URLs, including ones a browser normalises into one', () => {
    expect(getSafeRedirect('//evil.test')).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect('/\\evil.test')).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect('/\t/evil.test')).toBe(DEFAULT_REDIRECT_URL);
  });

  test('never returns to an auth route', () => {
    expect(getSafeRedirect('/auth')).toBe(DEFAULT_REDIRECT_URL);
    expect(getSafeRedirect('/auth?redirectUrl=%2Fx')).toBe(
      DEFAULT_REDIRECT_URL,
    );
    expect(getSafeRedirect('/auth/sign-in')).toBe(DEFAULT_REDIRECT_URL);
  });

  test('does not mistake a route that only starts with "auth" for an auth route', () => {
    expect(getSafeRedirect('/authors')).toBe('/authors');
  });

  test('uses the fallback it is given', () => {
    expect(getSafeRedirect('//evil.test', '/')).toBe('/');
  });
});

describe('getLoginHref', () => {
  test('is the bare login path with no redirectUrl', () => {
    expect(getLoginHref(undefined)).toBe('/auth');
  });

  test('carries the return path encoded under redirectUrl', () => {
    expect(getLoginHref('/plans/abc?tab=tasks')).toBe(
      '/auth?redirectUrl=%2Fplans%2Fabc%3Ftab%3Dtasks',
    );
  });

  test('builds against another login path', () => {
    expect(getLoginHref('/x', '/auth/sign-in')).toBe(
      '/auth/sign-in?redirectUrl=%2Fx',
    );
  });

  test('round-trips through the login URL unchanged', () => {
    const target = '/plans/a b?tab=tasks&q=1%2B1#top';
    const href = new URL(getLoginHref(target), 'http://localhost');

    expect(href.searchParams.get(REDIRECT_URL_PARAM)).toBe(target);
  });
});

describe('getRedirectUrlFromRequest', () => {
  test('returns pathname plus search for a document GET', () => {
    const request = new Request('http://localhost/plans/abc?tab=tasks');

    expect(getRedirectUrlFromRequest(request)).toBe('/plans/abc?tab=tasks');
  });

  test('maps a single-fetch .data request back to its page URL', () => {
    const request = new Request(
      'http://localhost/plans/abc.data?tab=tasks&_routes=root%2Croutes%2Fplans',
    );

    expect(getRedirectUrlFromRequest(request)).toBe('/plans/abc?tab=tasks');
  });

  test('drops a .data request with only _routes down to the bare path', () => {
    const request = new Request('http://localhost/plans.data?_routes=root');

    expect(getRedirectUrlFromRequest(request)).toBe('/plans');
  });

  test('returns undefined for the single-fetch root', () => {
    const request = new Request('http://localhost/_root.data');

    expect(getRedirectUrlFromRequest(request)).toBeUndefined();
  });

  test('returns undefined for a POST', () => {
    const request = new Request('http://localhost/plans/abc', {
      method: 'POST',
    });

    expect(getRedirectUrlFromRequest(request)).toBeUndefined();
  });

  test('returns undefined for the root path', () => {
    expect(getRedirectUrlFromRequest(new Request('http://localhost/'))).toBeUndefined(); // prettier-ignore
  });

  test('returns undefined for auth routes', () => {
    const request = new Request('http://localhost/auth/ws-token');

    expect(getRedirectUrlFromRequest(request)).toBeUndefined();
  });
});

describe('getLoginRedirectFromRequest', () => {
  const post = (referer: string | undefined): Request => {
    const headers = new Headers(referer === undefined ? {} : { referer });

    return new Request('http://localhost/resources/thing.data', {
      headers,
      method: 'POST',
    });
  };

  test('carries the page for a GET', () => {
    const request = new Request('http://localhost/plans/abc?tab=tasks');

    expect(getLoginRedirectFromRequest(request)).toBe(
      '/auth?redirectUrl=%2Fplans%2Fabc%3Ftab%3Dtasks',
    );
  });

  test('carries the referring page for a non-GET', () => {
    expect(getLoginRedirectFromRequest(post('http://localhost/plans/abc?tab=tasks'))).toBe('/auth?redirectUrl=%2Fplans%2Fabc%3Ftab%3Dtasks'); // prettier-ignore
  });

  test('keeps the login page exactly when a fetcher on it is redirected', () => {
    expect(getLoginRedirectFromRequest(post('http://localhost/auth?redirectUrl=%2Fplans'))).toBe('/auth?redirectUrl=%2Fplans'); // prettier-ignore
  });

  test('ignores a cross-origin referer', () => {
    expect(getLoginRedirectFromRequest(post('https://evil.test/plans'))).toBe('/auth'); // prettier-ignore
  });

  test('is bare /auth with no referer', () => {
    expect(getLoginRedirectFromRequest(post(undefined))).toBe('/auth');
  });
});
