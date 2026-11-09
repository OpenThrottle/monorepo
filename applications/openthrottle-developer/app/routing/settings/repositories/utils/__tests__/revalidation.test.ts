import type { ShouldRevalidateFunctionArgs } from 'react-router';
import { describe, expect, test } from 'vitest';

import { shouldRevalidateRepositories } from '~/routing/settings/repositories/utils/revalidation';

const BASE = 'http://localhost/settings/repositories';

const args = (
  current: string,
  next: string,
  overrides: Partial<ShouldRevalidateFunctionArgs> = {},
): ShouldRevalidateFunctionArgs => {
  return {
    currentParams: {},
    currentUrl: new URL(current, BASE),
    defaultShouldRevalidate: true,
    nextParams: {},
    nextUrl: new URL(next, BASE),
    ...overrides,
  };
};

const submission = (intent: string): Partial<ShouldRevalidateFunctionArgs> => {
  const formData = new FormData();
  formData.set('intent', intent);
  return { formAction: BASE, formData, formMethod: 'POST' };
};

describe('shouldRevalidateRepositories', () => {
  describe('a navigation that changes only view params', () => {
    test.each([
      ['search', '?search=web'],
      ['sort', '?sortBy=updatedAt&sortOrder=desc'],
      ['page', '?page=2&limit=10'],
      ['show-missing', '?showMissing=1'],
    ])('skips the loader for a %s change', (_label, next) => {
      expect(shouldRevalidateRepositories(args(BASE, next))).toBe(false);
    });

    test('skips the loader when a view param is removed', () => {
      expect(shouldRevalidateRepositories(args('?search=web', BASE))).toBe(
        false,
      );
    });
  });

  describe('a navigation that changes anything else', () => {
    test('revalidates when a non-view param changes alongside a view one', () => {
      expect(
        shouldRevalidateRepositories(args(BASE, '?search=web&modal=add')),
      ).toBe(true);
    });

    test('revalidates when arriving from another route', () => {
      expect(
        shouldRevalidateRepositories(
          args('http://localhost/settings', `${BASE}?search=web`),
        ),
      ).toBe(true);
    });
  });

  test('revalidates an explicit revalidate(), where the URL does not change', () => {
    expect(
      shouldRevalidateRepositories(args('?search=web', '?search=web')),
    ).toBe(true);
  });

  describe('after an action', () => {
    test.each([
      'addFolder',
      'cloneRepo',
      'deleteRepo',
      'pruneWorktreeCheckouts',
      'refreshCheckout',
      'removePlanRunWorktree',
      'rescanWorktrees',
    ])('revalidates after %s', (intent) => {
      expect(
        shouldRevalidateRepositories(args(BASE, BASE, submission(intent))),
      ).toBe(true);
    });

    test.each(['browseDirectory', 'pickFolderNative'])(
      'skips the loader after the read-only %s',
      (intent) => {
        expect(
          shouldRevalidateRepositories(args(BASE, BASE, submission(intent))),
        ).toBe(false);
      },
    );

    test('keeps React Router’s own answer when it declines to revalidate', () => {
      expect(
        shouldRevalidateRepositories(
          args(BASE, BASE, {
            ...submission('addFolder'),
            defaultShouldRevalidate: false,
          }),
        ),
      ).toBe(false);
    });
  });
});
