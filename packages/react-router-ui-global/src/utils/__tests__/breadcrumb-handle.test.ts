import { describe, expect, test } from 'vitest';
import type { UIMatch } from 'react-router';
import { hasBreadcrumbHandle } from '../breadcrumb-handle';
import type { BreadcrumbMatch } from '../breadcrumb-handle';

const baseMatch: Omit<UIMatch, 'handle'> = {
  id: 'route-1',
  loaderData: undefined,
  params: {},
  pathname: '/settings',
};

describe('hasBreadcrumbHandle', () => {
  test('returns true when handle is a plain object', () => {
    const match: UIMatch = { ...baseMatch, handle: { breadcrumb: () => 'X' } };

    expect(hasBreadcrumbHandle(match)).toBe(true);
  });

  test('returns false when handle is undefined', () => {
    const match: UIMatch = { ...baseMatch, handle: undefined };

    expect(hasBreadcrumbHandle(match)).toBe(false);
  });

  test('returns false when handle is null', () => {
    const match: UIMatch = { ...baseMatch, handle: null };

    expect(hasBreadcrumbHandle(match)).toBe(false);
  });

  test('returns false when handle is a primitive (string)', () => {
    const match: UIMatch = { ...baseMatch, handle: 'not-an-object' };

    expect(hasBreadcrumbHandle(match)).toBe(false);
  });

  test('narrows the match type so handle.breadcrumb/links are accessible', () => {
    const match: UIMatch = {
      ...baseMatch,
      handle: { breadcrumb: () => 'Settings', links: () => [] },
    };

    if (hasBreadcrumbHandle(match)) {
      const narrowed: BreadcrumbMatch = match;
      expect(narrowed.handle.breadcrumb?.(narrowed)).toBe('Settings');
      expect(narrowed.handle.links?.(narrowed)).toEqual([]);
    } else {
      throw new Error('expected match to have a breadcrumb handle');
    }
  });
});
