import { createMock } from '@golevelup/ts-vitest';
import type { SelectQueryBuilder } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import type { BlogPost } from './blog-post.entity.ts';
import {
  applyBlogPostStateFilter,
  applyBlogPostVisibility,
  BLOG_POST_STATE,
  deriveBlogPostState,
} from './blog-post-visibility.ts';

describe('applyBlogPostVisibility', () => {
  const andWhere = vi.fn();
  const queryBuilder = createMock<SelectQueryBuilder<BlogPost>>({
    andWhere: andWhere.mockReturnThis(),
  });

  it('restricts to PUBLISHED posts whose published_at is not in the future', () => {
    applyBlogPostVisibility(queryBuilder, 'p');

    expect(andWhere).toHaveBeenNthCalledWith(
      1,
      'p.status = :blogPostPublishedStatus',
      { blogPostPublishedStatus: BLOG_POST_STATUS.PUBLISHED },
    );
    expect(andWhere).toHaveBeenNthCalledWith(2, 'p.publishedAt <= NOW()');
    expect(andWhere).toHaveBeenCalledTimes(2);
  });
});

describe('deriveBlogPostState', () => {
  const now = new Date('2026-10-11T12:00:00.000Z');
  const before = new Date(now.getTime() - 1);
  const after = new Date(now.getTime() + 1);

  it.each([
    ['DRAFT', null, BLOG_POST_STATE.DRAFT],
    ['DRAFT', before, BLOG_POST_STATE.DRAFT],
    ['ARCHIVED', null, BLOG_POST_STATE.ARCHIVED],
    ['ARCHIVED', before, BLOG_POST_STATE.ARCHIVED],
    ['ARCHIVED', after, BLOG_POST_STATE.ARCHIVED],
  ] as const)(
    '%s with publishedAt %s is %s regardless of the date',
    (status, publishedAt, expected) => {
      expect(deriveBlogPostState({ publishedAt, status }, now)).toBe(expected);
    },
  );

  it('is LIVE when published one millisecond ago', () => {
    expect(
      deriveBlogPostState(
        { publishedAt: before, status: BLOG_POST_STATUS.PUBLISHED },
        now,
      ),
    ).toBe(BLOG_POST_STATE.LIVE);
  });

  it('is LIVE exactly at the boundary (publishedAt == now), matching SQL `<= NOW()`', () => {
    expect(
      deriveBlogPostState(
        { publishedAt: new Date(now), status: BLOG_POST_STATUS.PUBLISHED },
        now,
      ),
    ).toBe(BLOG_POST_STATE.LIVE);
  });

  it('is SCHEDULED when published one millisecond in the future', () => {
    expect(
      deriveBlogPostState(
        { publishedAt: after, status: BLOG_POST_STATUS.PUBLISHED },
        now,
      ),
    ).toBe(BLOG_POST_STATE.SCHEDULED);
  });

  it('never reports a PUBLISHED post with no publishedAt as LIVE', () => {
    expect(
      deriveBlogPostState(
        { publishedAt: null, status: BLOG_POST_STATUS.PUBLISHED },
        now,
      ),
    ).toBe(BLOG_POST_STATE.SCHEDULED);
  });
});

describe('applyBlogPostStateFilter', () => {
  const andWhere = vi.fn();
  const queryBuilder = createMock<SelectQueryBuilder<BlogPost>>({
    andWhere: andWhere.mockReturnThis(),
  });
  const params = {
    blogPostArchivedStatus: BLOG_POST_STATUS.ARCHIVED,
    blogPostDraftStatus: BLOG_POST_STATUS.DRAFT,
    blogPostPublishedStatus: BLOG_POST_STATUS.PUBLISHED,
  };

  beforeEach(() => {
    andWhere.mockClear();
  });

  it.each([
    [BLOG_POST_STATE.DRAFT, 'p.status = :blogPostDraftStatus'],
    [BLOG_POST_STATE.ARCHIVED, 'p.status = :blogPostArchivedStatus'],
    [
      BLOG_POST_STATE.SCHEDULED,
      '(p.status = :blogPostPublishedStatus AND p.publishedAt > NOW())',
    ],
    [
      BLOG_POST_STATE.LIVE,
      '(p.status = :blogPostPublishedStatus AND p.publishedAt <= NOW())',
    ],
  ])('translates %s to SQL', (state, clause) => {
    applyBlogPostStateFilter(queryBuilder, 'p', [state]);

    expect(andWhere).toHaveBeenCalledExactlyOnceWith(`(${clause})`, params);
  });

  it('ORs several states and ignores duplicates', () => {
    applyBlogPostStateFilter(queryBuilder, 'p', [
      BLOG_POST_STATE.DRAFT,
      BLOG_POST_STATE.LIVE,
      BLOG_POST_STATE.DRAFT,
    ]);

    expect(andWhere).toHaveBeenCalledExactlyOnceWith(
      '(p.status = :blogPostDraftStatus OR (p.status = :blogPostPublishedStatus AND p.publishedAt <= NOW()))',
      params,
    );
  });

  it('applies no restriction for an empty list', () => {
    applyBlogPostStateFilter(queryBuilder, 'p', []);

    expect(andWhere).not.toHaveBeenCalled();
  });
});
