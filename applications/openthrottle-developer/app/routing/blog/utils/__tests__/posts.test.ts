import { describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';

import {
  formatBlogPublishedLabel,
  generateBlogDraftSlug,
  isAgentEditor,
  parseBlogListParams,
  parseBlogState,
  toBlogStateParam,
} from '../posts';

const ISO = '2026-11-01T17:00:00.000Z';

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

describe('formatBlogPublishedLabel', () => {
  test('is an em dash when there is no publish time', () => {
    expect(formatBlogPublishedLabel(BlogPostState.Draft, null, 'UTC')).toBe(
      '—',
    );
  });

  test('says when a scheduled post goes live, with the zone', () => {
    expect(formatBlogPublishedLabel(BlogPostState.Scheduled, ISO, 'UTC')).toBe(
      'goes live Nov 1, 2026, 5:00 PM UTC',
    );
  });

  test('shows only the date for a live post', () => {
    expect(formatBlogPublishedLabel(BlogPostState.Live, ISO, 'UTC')).toBe(
      'Nov 1, 2026, 5:00 PM UTC',
    );
  });
});

describe('isAgentEditor', () => {
  test('recognises the MCP service account', () => {
    expect(isAgentEditor('openthrottle-mcp')).toBe(true);
  });

  test('matches case-insensitively', () => {
    expect(isAgentEditor('OpenThrottle-MCP')).toBe(true);
  });

  test.each(['visormatt', 'Ada Lovelace', 'unknown-service-account'])(
    'treats %s as a person',
    (name) => {
      expect(isAgentEditor(name)).toBe(false);
    },
  );

  test('never treats an email as an agent', () => {
    expect(isAgentEditor('openthrottle-mcp@example.com')).toBe(false);
  });

  test('treats a post with no recorded editor as not agent-edited', () => {
    expect(isAgentEditor(null)).toBe(false);
  });
});

describe('generateBlogDraftSlug', () => {
  test('satisfies the server slug rule', () => {
    const slug = generateBlogDraftSlug(1_700_000_000_000, () => 0.5);

    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slug.startsWith('untitled-')).toBe(true);
    expect(generateBlogDraftSlug(1, () => 0)).toBe('untitled-1-0000');
  });
});
