import { describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';

import {
  parseBlogListParams,
  parseBlogState,
  toBlogStateParam,
} from '../parsers';

describe('parseBlogState', () => {
  test.each([
    ['draft', BlogPostState.Draft],
    ['scheduled', BlogPostState.Scheduled],
    ['live', BlogPostState.Live],
    ['archived', BlogPostState.Archived],
    ['SCHEDULED', BlogPostState.Scheduled],
  ])('maps %s to %s', (raw, expected) => {
    expect(parseBlogState(raw)).toBe(expected);
  });

  test.each([null, '', 'bogus'])('falls back to Draft for %s', (raw) => {
    expect(parseBlogState(raw)).toBe(BlogPostState.Draft);
  });
});

describe('toBlogStateParam', () => {
  test('lower-cases the enum value', () => {
    expect(toBlogStateParam(BlogPostState.Scheduled)).toBe('scheduled');
  });
});

describe('parseBlogListParams', () => {
  test('defaults to the first page of Drafts with no search', () => {
    expect(parseBlogListParams(new URLSearchParams())).toEqual({
      after: null,
      search: null,
      state: BlogPostState.Draft,
    });
  });

  test('reads state, q and after', () => {
    const params = new URLSearchParams('state=live&q=%20launch%20&after=abc');

    expect(parseBlogListParams(params)).toEqual({
      after: 'abc',
      search: 'launch',
      state: BlogPostState.Live,
    });
  });

  test('treats blank q and after as absent', () => {
    const params = new URLSearchParams('q=%20&after=');

    expect(parseBlogListParams(params)).toMatchObject({
      after: null,
      search: null,
    });
  });
});
