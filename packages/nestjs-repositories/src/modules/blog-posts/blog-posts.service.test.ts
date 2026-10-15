import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import type { BlogPostStatus } from './blog-post.constants.ts';
import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import { BlogPost } from './blog-post.entity.ts';
import { blogPostsFactory } from './blog-posts.factory.ts';
import { BlogPostsService } from './blog-posts.service.ts';

/** The "database clock" the fake evaluates `NOW()` against. */
const NOW = '2026-10-11T00:00:00.000000Z';
const PAST = '2026-09-01T00:00:00.000000Z';
const FUTURE = '2026-12-01T00:00:00.000000Z';

interface FakeRow {
  readonly id: string;
  readonly publishedAt: string | null;
  readonly slug: string;
  readonly status: BlogPostStatus;
  readonly tagSlugs: readonly string[];
}

interface Condition {
  readonly params: Record<string, string> | undefined;
  readonly sql: string;
}

const row = (
  id: string,
  status: BlogPostStatus,
  publishedAt: string | null,
  tagSlugs: readonly string[] = [],
): FakeRow => ({ id, publishedAt, slug: `slug-${id}`, status, tagSlugs });

/**
 * Evaluates one recorded WHERE clause against a row. Only the clauses the service is
 * allowed to emit are understood; anything else fails the test, so a restated or new
 * visibility rule cannot slip in unnoticed.
 */
const matches = (
  candidate: FakeRow,
  { params = {}, sql }: Condition,
): boolean => {
  if (sql === 'post.status = :blogPostPublishedStatus') {
    return candidate.status === params.blogPostPublishedStatus;
  }
  if (sql === 'post.publishedAt <= NOW()') {
    return candidate.publishedAt != null && candidate.publishedAt <= NOW;
  }
  if (sql === 'post.slug = :slug') return candidate.slug === params.slug;
  if (sql.startsWith('EXISTS ')) {
    return candidate.tagSlugs.includes(params.tagSlug ?? '');
  }
  if (sql.startsWith('(post.publishedAt, post.id) <')) {
    const { cursorId = '', cursorPublishedAt = '' } = params;
    const published = candidate.publishedAt ?? '';
    return (
      published < cursorPublishedAt ||
      (published === cursorPublishedAt && candidate.id < cursorId)
    );
  }
  throw new Error(`Unexpected clause: ${sql}`);
};

/** Chainable fake query builder that applies recorded clauses to `rows`. */
const fakeQueryBuilder = (getRows: () => readonly FakeRow[]) => {
  const conditions: Condition[] = [];
  let limit = Number.POSITIVE_INFINITY;
  const record = (sql: string, params?: Record<string, string>) => {
    conditions.push({ params, sql });
    return builder;
  };
  const visible = () =>
    [...getRows()]
      .filter((candidate) =>
        conditions.every((condition) => matches(candidate, condition)),
      )
      .sort(
        (a, b) =>
          (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') ||
          b.id.localeCompare(a.id),
      );
  // Sub-queries are built on their own chain; their text is opaque to the fake.
  const subQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    getQuery: vi.fn(() => '(SELECT 1)'),
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const builder = {
    addOrderBy: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn(record),
    getOne: vi.fn(() => Promise.resolve(visible()[0] ?? null)),
    getRawMany: vi.fn(() =>
      Promise.resolve(
        visible()
          .slice(0, limit)
          .map((r) => ({ cursorPublishedAt: r.publishedAt, id: r.id })),
      ),
    ),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    limit: vi.fn((value: number) => {
      limit = value;
      return builder;
    }),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    subQuery: vi.fn(() => subQueryBuilder),
    where: vi.fn(record),
  };
  return builder;
};

describe('BlogPostsService', () => {
  type GetRepository = ReturnType<BlogPostsService['getRepository']>;

  // Ties on purpose: three PUBLISHED rows share one published_at.
  const tied = PAST;
  const rows: readonly FakeRow[] = [
    row('00000000-0000-4000-8000-00000000000a', 'DRAFT', null),
    row('00000000-0000-4000-8000-00000000000b', 'DRAFT', PAST),
    row('00000000-0000-4000-8000-00000000000c', 'ARCHIVED', PAST),
    row('00000000-0000-4000-8000-00000000000d', 'PUBLISHED', FUTURE),
    row('00000000-0000-4000-8000-000000000001', 'PUBLISHED', tied, ['ops']),
    row('00000000-0000-4000-8000-000000000002', 'PUBLISHED', tied),
    row('00000000-0000-4000-8000-000000000003', 'PUBLISHED', tied, ['ops']),
    row(
      '00000000-0000-4000-8000-000000000004',
      'PUBLISHED',
      '2026-08-01T00:00:00.000000Z',
    ),
  ];
  const visibleIds = [
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000004',
  ];

  const hydrated = rows.map((r) =>
    Object.assign(
      new BlogPost(),
      blogPostsFactory.build({ id: r.id, slug: r.slug, status: r.status }),
      { author: null, tags: [] },
    ),
  );
  const find = vi.fn();
  let service: BlogPostsService;
  let activeRows: readonly FakeRow[] = rows;
  let queryBuilder: ReturnType<typeof fakeQueryBuilder>;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue(hydrated);
    activeRows = rows;
    queryBuilder = fakeQueryBuilder(() => activeRows);

    const app = await Test.createTestingModule({
      providers: [
        BlogPostsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(BlogPost),
          useValue: createMock<GetRepository>({
            createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
            find,
          }),
        },
        { provide: getRepositoryToken(BlogAuthor), useValue: createMock() },
        { provide: getRepositoryToken(BlogTag), useValue: createMock() },
      ],
    }).compile();

    service = app.get<BlogPostsService>(BlogPostsService);
  });

  describe('findPublished visibility', () => {
    it('excludes drafts (with and without a published_at), archived and future-scheduled posts', async () => {
      const page = await service.findPublished({ first: 50 });

      expect(page.items.map((post) => post.id)).toEqual(visibleIds);
      expect(page.hasNextPage).toBe(false);
    });

    it.each([
      ['a draft', '00000000-0000-4000-8000-00000000000a'],
      ['a draft with a past date', '00000000-0000-4000-8000-00000000000b'],
      ['an archived post', '00000000-0000-4000-8000-00000000000c'],
      ['a future-scheduled post', '00000000-0000-4000-8000-00000000000d'],
    ])('never returns %s', async (_label, id) => {
      const page = await service.findPublished({ first: 50 });

      expect(page.items.map((post) => post.id)).not.toContain(id);
    });

    it('returns a PUBLISHED post whose published_at has passed', async () => {
      const page = await service.findPublished({ first: 50 });

      expect(page.items.map((post) => post.status)).toEqual(
        Array(visibleIds.length).fill(BLOG_POST_STATUS.PUBLISHED),
      );
    });

    it('loads author and tags in the hydrating query', async () => {
      await service.findPublished({ first: 50 });

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: { author: true, tags: true } }),
      );
    });
  });

  describe('findPublished pagination', () => {
    it('reports hasNextPage and an endCursor when more rows remain', async () => {
      const page = await service.findPublished({ first: 2 });

      expect(page.items.map((post) => post.id)).toEqual(visibleIds.slice(0, 2));
      expect(page.hasNextPage).toBe(true);
      expect(page.endCursor).toEqual(expect.any(String));
    });

    it('returns an empty page without a cursor when nothing is visible', async () => {
      activeRows = [row('x', 'DRAFT', null)];
      const result = await service.findPublished({ first: 5 });

      expect(result).toEqual({
        endCursor: null,
        hasNextPage: false,
        items: [],
      });
    });

    it.each([1, 2, 3])(
      'walks every page of size %i exactly once, stable across equal published_at values',
      async (first) => {
        const seen: string[] = [];
        let after: string | null = null;
        let guard = 0;

        do {
          // eslint-disable-next-line no-await-in-loop -- each page needs the previous cursor
          const page = await service.findPublished({ after, first });
          seen.push(...page.items.map((post) => post.id));
          after = page.hasNextPage ? page.endCursor : null;
          guard += 1;
        } while (after != null && guard < 10);

        expect(seen).toEqual(visibleIds);
      },
    );

    it('rejects a cursor it did not produce', async () => {
      await expect(
        service.findPublished({ after: 'garbage', first: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findPublished tag filter', () => {
    it('keeps only posts carrying the tag', async () => {
      const page = await service.findPublished({ first: 50, tagSlug: 'ops' });

      expect(page.items.map((post) => post.id)).toEqual([
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001',
      ]);
    });

    it('does not add a tag clause when tagSlug is absent', async () => {
      await service.findPublished({ first: 50, tagSlug: null });

      expect(
        queryBuilder.andWhere.mock.calls.some(([sql]) =>
          String(sql).startsWith('EXISTS'),
        ),
      ).toBe(false);
    });
  });

  describe('findPublishedBySlug', () => {
    it('returns a visible post by slug', async () => {
      const post = await service.findPublishedBySlug(
        'slug-00000000-0000-4000-8000-000000000001',
      );

      expect(post).not.toBeNull();
    });

    it.each([
      ['draft', '00000000-0000-4000-8000-00000000000b'],
      ['archived', '00000000-0000-4000-8000-00000000000c'],
      ['future-scheduled', '00000000-0000-4000-8000-00000000000d'],
    ])('returns null for a %s post', async (_label, id) => {
      expect(await service.findPublishedBySlug(`slug-${id}`)).toBeNull();
    });

    it('returns null for an unknown slug', async () => {
      expect(await service.findPublishedBySlug('nope')).toBeNull();
    });
  });
});
