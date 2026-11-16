import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { describe, expect, test } from 'vitest';

import { shouldRevalidateIgnoringParams } from '../shouldRevalidateIgnoringParams';

const ORIGIN = 'http://localhost';

const buildArgs = (
  current: string,
  next: string,
  overrides: Partial<ShouldRevalidateFunctionArgs> = {},
): ShouldRevalidateFunctionArgs => {
  return {
    currentParams: {},
    currentUrl: new URL(current, ORIGIN),
    defaultShouldRevalidate: true,
    nextParams: {},
    nextUrl: new URL(next, ORIGIN),
    ...overrides,
  };
};

describe('shouldRevalidateIgnoringParams', () => {
  const shouldRevalidate = shouldRevalidateIgnoringParams(['stats']);

  test.each([
    ['opening stats', '/plans', '/plans?stats=open', false],
    ['closing stats', '/plans?stats=open', '/plans', false],
    [
      'toggling stats alongside unchanged filters',
      '/plans?status=QUEUED&search=a',
      '/plans?search=a&status=QUEUED&stats=open',
      false,
    ],
    ['another param changing', '/plans', '/plans?status=QUEUED', true],
    [
      'stats and another param changing together',
      '/plans',
      '/plans?stats=open&status=QUEUED',
      true,
    ],
    ['a different pathname', '/plans?stats=open', '/projects', true],
    ['a same-URL revalidation', '/plans?stats=open', '/plans?stats=open', true],
  ])('%s → %s', (_label, current, next, expected) => {
    expect(shouldRevalidate(buildArgs(current, next))).toBe(expected);
  });

  test('defers to defaultShouldRevalidate on a form submission', () => {
    expect(
      shouldRevalidate(
        buildArgs('/plans', '/plans?stats=open', { formMethod: 'POST' }),
      ),
    ).toBe(true);
  });

  test('passes through defaultShouldRevalidate=false when not skipping', () => {
    expect(
      shouldRevalidate(
        buildArgs('/plans', '/plans?status=QUEUED', {
          defaultShouldRevalidate: false,
        }),
      ),
    ).toBe(false);
  });

  test('keeps repeated values of one key in order', () => {
    expect(
      shouldRevalidate(buildArgs('/plans?tag=a&tag=b', '/plans?tag=b&tag=a')),
    ).toBe(true);
  });
});
