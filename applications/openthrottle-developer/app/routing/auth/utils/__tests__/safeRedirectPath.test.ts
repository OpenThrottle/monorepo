import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from '../safeRedirectPath';

describe('safeRedirectPath', () => {
  it('keeps a same-origin path with its query', () => {
    expect(safeRedirectPath('/oauth/consent?request=abc')).toBe(
      '/oauth/consent?request=abc',
    );
  });

  it('falls back when absent', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined, '/x')).toBe('/x');
  });

  it('refuses anything that could leave the origin', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example/path',
      '/\\evil.example',
      'javascript:alert(1)',
      'dashboard',
      '/ok\n//evil',
    ]) {
      expect(safeRedirectPath(value), value).toBe('/dashboard');
    }
  });
});
