import { describe, expect, test } from 'vitest';

import { getSafeRedirect, getSignInHref } from '../auth-redirect';

describe('getSafeRedirect', () => {
  test('keeps a same-origin path with its search', () => {
    expect(getSafeRedirect('/fragments/abc?tab=edit')).toBe(
      '/fragments/abc?tab=edit',
    );
  });

  test('falls back to / for anything that is not a path', () => {
    expect(getSafeRedirect(null)).toBe('/');
    expect(getSafeRedirect('')).toBe('/');
    expect(getSafeRedirect('https://evil.test')).toBe('/');
  });

  test('refuses protocol-relative URLs', () => {
    expect(getSafeRedirect('//evil.test')).toBe('/');
    expect(getSafeRedirect('/\\evil.test')).toBe('/');
  });

  test('never returns to an auth route', () => {
    expect(getSafeRedirect('/auth/sign-in')).toBe('/');
  });
});

describe('getSignInHref', () => {
  test('carries the return path as an encoded redirectTo', () => {
    expect(getSignInHref('/fragments/abc?x=1')).toBe(
      '/auth/sign-in?redirectTo=%2Ffragments%2Fabc%3Fx%3D1',
    );
  });
});
