import { describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';

import {
  didBlogPostLifecycleWrite,
  isBlogPostLifecycleBody,
  isBlogPostLifecycleResult,
  parseBlogPostLifecycleRequest,
  toBlogPostArchiveResult,
  toBlogPostPublishResult,
  toBlogPostUnpublishResult,
} from '../lifecycle-results';

const NOT_FOUND = {
  __typename: 'BlogPostNotFoundError',
  message: 'gone',
} as const;

describe('isBlogPostLifecycleBody', () => {
  test.each(['archive', 'publish', 'unpublish'])('recognises %s', (intent) => {
    expect(isBlogPostLifecycleBody({ intent })).toBe(true);
  });

  test.each([{ intent: 'save' }, { intent: 1 }, {}, null, 'publish'])(
    'ignores %o',
    (body) => {
      expect(isBlogPostLifecycleBody(body)).toBe(false);
    },
  );
});

describe('parseBlogPostLifecycleRequest', () => {
  test('accepts each intent', () => {
    expect(parseBlogPostLifecycleRequest({ intent: 'archive' })).toEqual({
      intent: 'archive',
    });
    expect(parseBlogPostLifecycleRequest({ intent: 'unpublish' })).toEqual({
      intent: 'unpublish',
    });
    expect(
      parseBlogPostLifecycleRequest({ intent: 'publish', publishedAt: null }),
    ).toEqual({ intent: 'publish', publishedAt: null });
    expect(
      parseBlogPostLifecycleRequest({
        intent: 'publish',
        publishedAt: '2026-11-01T17:00:00.000Z',
      }),
    ).toEqual({ intent: 'publish', publishedAt: '2026-11-01T17:00:00.000Z' });
  });

  test.each([
    { intent: 'publish' },
    { intent: 'publish', publishedAt: 'tomorrow' },
    { extra: true, intent: 'archive' },
    { intent: 'delete' },
    null,
  ])('rejects %o', (body) => {
    expect(parseBlogPostLifecycleRequest(body)).toBeNull();
  });
});

describe('union mappers', () => {
  test('publish reports the new state and date', () => {
    expect(
      toBlogPostPublishResult({
        __typename: 'BlogPostAdminObject',
        id: 'p',
        publishedAt: '2026-11-01T17:00:00.000Z',
        state: BlogPostState.Scheduled,
        updatedAt: '2026-10-26T00:00:00.000Z',
      }),
    ).toEqual({
      outcome: 'published',
      publishedAt: '2026-11-01T17:00:00.000Z',
      state: BlogPostState.Scheduled,
    });
  });

  test('every mutation maps its not-found branch', () => {
    const expected = { message: 'gone', outcome: 'lifecycleNotFound' };

    expect(toBlogPostPublishResult(NOT_FOUND)).toEqual(expected);
    expect(toBlogPostUnpublishResult(NOT_FOUND)).toEqual(expected);
    expect(toBlogPostArchiveResult(NOT_FOUND)).toEqual(expected);
  });

  test('unpublish and archive map their success branch', () => {
    const post = {
      __typename: 'BlogPostAdminObject',
      id: 'p',
      state: BlogPostState.Draft,
      updatedAt: '2026-10-26T00:00:00.000Z',
    } as const;

    expect(toBlogPostUnpublishResult(post)).toEqual({ outcome: 'unpublished' });
    expect(toBlogPostArchiveResult(post)).toEqual({ outcome: 'archived' });
  });
});

describe('result guards', () => {
  test('only a written post revalidates the loader', () => {
    expect(didBlogPostLifecycleWrite({ outcome: 'archived' })).toBe(true);
    expect(didBlogPostLifecycleWrite({ outcome: 'unpublished' })).toBe(true);
    expect(
      didBlogPostLifecycleWrite({
        outcome: 'published',
        publishedAt: null,
        state: BlogPostState.Live,
      }),
    ).toBe(true);
    expect(
      didBlogPostLifecycleWrite({ message: 'm', outcome: 'lifecycleNotFound' }),
    ).toBe(false);
    expect(
      didBlogPostLifecycleWrite({ message: 'm', outcome: 'lifecycleError' }),
    ).toBe(false);
    expect(didBlogPostLifecycleWrite({ outcome: 'saved' })).toBe(false);
  });

  test('a save result is not a lifecycle result', () => {
    expect(isBlogPostLifecycleResult({ outcome: 'saved' })).toBe(false);
    expect(isBlogPostLifecycleResult(undefined)).toBe(false);
  });
});
