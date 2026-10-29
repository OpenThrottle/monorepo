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
import { BLOG_POST_STATE } from './blog-post-visibility.ts';
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
  readonly title: string;
  readonly updatedAt: string;
}

interface Condition {
  readonly params: Record<string, string> | undefined;
  readonly sql: string;
}

const id = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const row = (
  n: number,
  status: BlogPostStatus,
  publishedAt: string | null,
  updatedAt: string,
  title = `Post ${n}`,
  slug = `slug-${n}`,
): FakeRow => ({ id: id(n), publishedAt, slug, status, title, updatedAt });

/** One atom of the state filter, evaluated against the fake clock. */
const matchesStateAtom = (candidate: FakeRow, atom: string): boolean => {
  switch (atom) {
    case 'post.status = :blogPostDraftStatus':
      return candidate.status === BLOG_POST_STATUS.DRAFT;
    case 'post.status = :blogPostArchivedStatus':
      return candidate.status === BLOG_POST_STATUS.ARCHIVED;
    case '(post.status = :blogPostPublishedStatus AND post.publishedAt > NOW())':
      return (
        candidate.status === BLOG_POST_STATUS.PUBLISHED &&
        candidate.publishedAt != null &&
        candidate.publishedAt > NOW
      );
    case '(post.status = :blogPostPublishedStatus AND post.publishedAt <= NOW())':
      return (
        candidate.status === BLOG_POST_STATUS.PUBLISHED &&
        candidate.publishedAt != null &&
        candidate.publishedAt <= NOW
      );
    default:
      throw new Error(`Unexpected state clause: ${atom}`);
  }
};

const SEARCH_SQL = '(post.title ILIKE :search OR post.slug ILIKE :search)';

const escapeRegExp = (char: string): string =>
  char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Evaluates a LIKE pattern with `\` escapes, case-insensitively. */
const ilike = (value: string, pattern: string): boolean => {
  const source = [...pattern].reduce<{ escaped: boolean; out: string }>(
    (acc, char) => {
      if (acc.escaped) {
        return { escaped: false, out: `${acc.out}${escapeRegExp(char)}` };
      }
      if (char === '\\') return { ...acc, escaped: true };
      if (char === '%') return { ...acc, out: `${acc.out}.*` };
      if (char === '_') return { ...acc, out: `${acc.out}.` };
      return { ...acc, out: `${acc.out}${escapeRegExp(char)}` };
    },
    { escaped: false, out: '' },
  ).out;
  return new RegExp(`^${source}$`, 'is').test(value);
};

/**
 * Evaluates one recorded WHERE clause against a row. Only the clauses the admin list is
 * allowed to emit are understood; anything else fails the test.
 */
const matches = (
  candidate: FakeRow,
  { params = {}, sql }: Condition,
): boolean => {
  if (sql === SEARCH_SQL) {
    const pattern = params.search ?? '';
    return ilike(candidate.title, pattern) || ilike(candidate.slug, pattern);
  }
  if (sql.startsWith('(post.updatedAt, post.id) <')) {
    const { cursorId = '', cursorUpdatedAt = '' } = params;
    return (
      candidate.updatedAt < cursorUpdatedAt ||
      (candidate.updatedAt === cursorUpdatedAt && candidate.id < cursorId)
    );
  }
  if (sql.startsWith('(') && sql.endsWith(')')) {
    // The state filter: OR-ed atoms, split at top-level ` OR `.
    const atoms = sql.slice(1, -1).split(/ OR (?=\(?post\.status)/);
    return atoms.some((atom) => matchesStateAtom(candidate, atom));
  }
  throw new Error(`Unexpected clause: ${sql}`);
};

const fakeQueryBuilder = (rows: readonly FakeRow[]) => {
  const conditions: Condition[] = [];
  let limit = Number.POSITIVE_INFINITY;
  const builder = {
    addOrderBy: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn((sql: string, params?: Record<string, string>) => {
      conditions.push({ params, sql });
      return builder;
    }),
    getRawMany: vi.fn(() =>
      Promise.resolve(
        rows
          .filter((candidate) =>
            conditions.every((condition) => matches(candidate, condition)),
          )
          .sort(
            (a, b) =>
              b.updatedAt.localeCompare(a.updatedAt) ||
              b.id.localeCompare(a.id),
          )
          .slice(0, limit)
          .map((r) => ({ cursorUpdatedAt: r.updatedAt, id: r.id })),
      ),
    ),
    limit: vi.fn((value: number) => {
      limit = value;
      return builder;
    }),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  };
  return builder;
};

describe('BlogPostsService.findAdminPosts', () => {
  type GetRepository = ReturnType<BlogPostsService['getRepository']>;

  // Ties on purpose: rows 4-6 share one updated_at.
  const TIED = '2026-10-05T10:00:00.000001Z';
  const rows: readonly FakeRow[] = [
    row(
      1,
      'DRAFT',
      null,
      '2026-10-10T10:00:00.000000Z',
      'Draft intro',
      'draft-intro',
    ),
    row(2, 'ARCHIVED', PAST, '2026-10-09T10:00:00.000000Z'),
    row(
      3,
      'PUBLISHED',
      FUTURE,
      '2026-10-08T10:00:00.000000Z',
      'Scheduled',
      'scheduled-launch',
    ),
    row(4, 'PUBLISHED', PAST, TIED, 'Live four'),
    row(5, 'PUBLISHED', NOW, TIED, 'Live at the boundary'),
    row(6, 'DRAFT', null, TIED, '100% coverage', 'coverage-100'),
    row(
      7,
      'PUBLISHED',
      PAST,
      '2026-09-01T10:00:00.000000Z',
      'Oldest live',
      'oldest',
    ),
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
  let queryBuilder: ReturnType<typeof fakeQueryBuilder>;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue(hydrated);
    queryBuilder = fakeQueryBuilder(rows);

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

  const ids = (page: { items: readonly BlogPost[] }): string[] =>
    page.items.map((post) => post.id);

  describe('ordering and pagination', () => {
    it('returns every state, most recently updated first, ties broken by id desc', async () => {
      const page = await service.findAdminPosts({ first: 50 });

      expect(ids(page)).toEqual([1, 2, 3, 6, 5, 4, 7].map(id));
      expect(page.hasNextPage).toBe(false);
    });

    it('walks pages with a cursor, without skipping or repeating rows tied on updated_at', async () => {
      const walk = async (
        after: string | null,
        seen: readonly string[],
        pages: number,
      ): Promise<{ pages: number; seen: readonly string[] }> => {
        const page = await service.findAdminPosts({ after, first: 2 });
        const next = [...seen, ...ids(page)];
        return page.hasNextPage
          ? walk(page.endCursor, next, pages + 1)
          : { pages: pages + 1, seen: next };
      };
      const { pages, seen } = await walk(null, [], 0);

      expect(seen).toEqual([1, 2, 3, 6, 5, 4, 7].map(id));
      expect(pages).toBe(4);
    });

    it('fetches first + 1 keys to derive hasNextPage', async () => {
      const page = await service.findAdminPosts({ first: 3 });

      expect(queryBuilder.limit).toHaveBeenCalledWith(4);
      expect(page.hasNextPage).toBe(true);
      expect(page.items).toHaveLength(3);
    });

    it('encodes the cursor from the last row at microsecond precision', async () => {
      const page = await service.findAdminPosts({ first: 5 });

      expect(
        Buffer.from(page.endCursor ?? '', 'base64url').toString('utf8'),
      ).toBe(`${TIED}|${id(5)}`);
    });

    it('returns an empty page when nothing matches', async () => {
      expect(
        await service.findAdminPosts({ first: 5, search: 'zzz-no-match' }),
      ).toEqual({ endCursor: null, hasNextPage: false, items: [] });
      expect(find).not.toHaveBeenCalled();
    });

    it('rejects a cursor this service did not produce', async () => {
      await expect(
        service.findAdminPosts({ after: 'garbage', first: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('state filter (translated to SQL, not filtered in memory)', () => {
    it.each([
      [BLOG_POST_STATE.DRAFT, [1, 6]],
      [BLOG_POST_STATE.ARCHIVED, [2]],
      [BLOG_POST_STATE.SCHEDULED, [3]],
      // publishedAt == NOW() is LIVE, like the public visibility rule.
      [BLOG_POST_STATE.LIVE, [5, 4, 7]],
    ])('%s returns only matching rows', async (state, expected) => {
      const page = await service.findAdminPosts({ first: 50, states: [state] });

      expect(ids(page)).toEqual(expected.map(id));
    });

    it('ORs several states', async () => {
      const page = await service.findAdminPosts({
        first: 50,
        states: [BLOG_POST_STATE.SCHEDULED, BLOG_POST_STATE.ARCHIVED],
      });

      expect(ids(page)).toEqual([2, 3].map(id));
    });

    it.each([[undefined], [null], [[]]])(
      'applies no state restriction for %j',
      async (states) => {
        const page = await service.findAdminPosts({ first: 50, states });

        expect(page.items).toHaveLength(rows.length);
        expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      },
    );

    it('combines with the cursor', async () => {
      const first = await service.findAdminPosts({
        first: 1,
        states: [BLOG_POST_STATE.LIVE],
      });
      const second = await service.findAdminPosts({
        after: first.endCursor,
        first: 5,
        states: [BLOG_POST_STATE.LIVE],
      });

      expect(ids(first)).toEqual([id(5)]);
      expect(ids(second)).toEqual([4, 7].map(id));
    });
  });

  describe('search (ILIKE on title OR slug)', () => {
    it('matches the title case-insensitively', async () => {
      const page = await service.findAdminPosts({
        first: 50,
        search: 'LIVE FOUR',
      });

      expect(ids(page)).toEqual([id(4)]);
    });

    it('matches the slug', async () => {
      const page = await service.findAdminPosts({
        first: 50,
        search: 'launch',
      });

      expect(ids(page)).toEqual([id(3)]);
    });

    it('matches a substring in either column', async () => {
      const page = await service.findAdminPosts({ first: 50, search: 'draft' });

      expect(ids(page)).toEqual([id(1)]);
    });

    it('treats LIKE wildcards in the term literally', async () => {
      const percent = await service.findAdminPosts({
        first: 50,
        search: '100%',
      });
      const underscore = await service.findAdminPosts({
        first: 50,
        search: 'p_st',
      });

      expect(ids(percent)).toEqual([id(6)]);
      expect(underscore.items).toEqual([]);
    });

    it('binds the term as an escaped pattern parameter', async () => {
      await service.findAdminPosts({ first: 5, search: '  a_b%c\\d ' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(SEARCH_SQL, {
        search: '%a\\_b\\%c\\\\d%',
      });
    });

    it.each([[undefined], [null], [''], ['   ']])(
      'ignores a blank search %j',
      async (search) => {
        const page = await service.findAdminPosts({ first: 50, search });

        expect(page.items).toHaveLength(rows.length);
      },
    );

    it('combines with a state filter', async () => {
      const page = await service.findAdminPosts({
        first: 50,
        search: 'oldest',
        states: [BLOG_POST_STATE.LIVE],
      });

      expect(ids(page)).toEqual([id(7)]);
    });

    it('excludes a matching row outside the state filter', async () => {
      const page = await service.findAdminPosts({
        first: 50,
        search: 'scheduled',
        states: [BLOG_POST_STATE.LIVE],
      });

      expect(page.items).toEqual([]);
    });
  });
});
