import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Repository,
  SelectQueryBuilder,
  UpdateQueryBuilder,
} from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { blogAuthorsFactory } from '../blog-authors/blog-authors.factory.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import { blogTagsFactory } from '../blog-tags/blog-tags.factory.ts';
import { BlogPost } from './blog-post.entity.ts';
import { BLOG_POST_STATUS } from './blog-posts.constants.ts';
import { blogPostsFactory } from './blog-posts.factory.ts';
import { BlogPostsService } from './blog-posts.service.ts';
import type { BlogPostStatus } from './blog-posts.types.ts';
import { BLOG_POST_STATE } from './visibility/visibility.constants.ts';
import {
  BLOG_WRITE_ENTITY,
  BLOG_WRITE_RESULT_KIND,
} from './write-result/write-result.constants.ts';

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
): FakeRow => {
  return { id, publishedAt, slug: `slug-${id}`, status, tagSlugs };
};

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
  const visible = () => {
    return [...getRows()]
      .filter((candidate) =>
        conditions.every((condition) => matches(candidate, condition)),
      )
      .sort(
        (a, b) =>
          (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') ||
          b.id.localeCompare(a.id),
      );
  };
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

describe('BlogPostsService admin listing', () => {
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

  const id = (n: number): string => {
    return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  };

  const row = (
    n: number,
    status: BlogPostStatus,
    publishedAt: string | null,
    updatedAt: string,
    title = `Post ${n}`,
    slug = `slug-${n}`,
  ): FakeRow => {
    return { id: id(n), publishedAt, slug, status, title, updatedAt };
  };

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

  const escapeRegExp = (char: string): string => {
    return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

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

    const ids = (page: { items: readonly BlogPost[] }): string[] => {
      return page.items.map((post) => post.id);
    };

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
        const page = await service.findAdminPosts({
          first: 50,
          states: [state],
        });

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
        const page = await service.findAdminPosts({
          first: 50,
          search: 'draft',
        });

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
});

describe('BlogPostsService write path', () => {
  const NOW = new Date('2026-10-11T12:00:00.000Z');
  const FUTURE = new Date('2026-12-25T09:00:00.000Z');
  const PAST = new Date('2026-09-01T00:00:00.000Z');

  const EDITOR = 'Ada Lovelace';

  const uniqueViolation = (): QueryFailedError => {
    return new QueryFailedError(
      'INSERT INTO blog_posts',
      [],
      Object.assign(new Error('duplicate key value'), { code: '23505' }),
    );
  };

  const buildPost = (overrides: Partial<BlogPost> = {}): BlogPost => {
    return Object.assign(
      new BlogPost(),
      blogPostsFactory.build({
        publishedAt: null,
        slug: 'existing-post',
        status: BLOG_POST_STATUS.DRAFT,
      }),
      { author: null, tags: [] },
      overrides,
    );
  };

  describe('BlogPostsService write path', () => {
    const postRepository = createMock<Repository<BlogPost>>();
    const set = vi.fn();
    const where = vi.fn();
    const andWhere = vi.fn();
    const execute = vi.fn();
    const updateBuilder = createMock<UpdateQueryBuilder<BlogPost>>({
      andWhere: andWhere.mockReturnThis(),
      execute,
      set: set.mockReturnThis(),
      where: where.mockReturnThis(),
    });
    const selectBuilder = createMock<SelectQueryBuilder<BlogPost>>({
      update: vi.fn().mockReturnValue(updateBuilder),
    });
    const authorRepository = createMock<Repository<BlogAuthor>>();
    const tagRepository = createMock<Repository<BlogTag>>();
    let service: BlogPostsService;

    /** `findOne` (the reload after a save) returns whatever `post` currently holds. */
    const reloadReturns = (post: BlogPost): void => {
      postRepository.findOne.mockResolvedValue(post);
    };

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(NOW);

      execute.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });
      postRepository.createQueryBuilder.mockReturnValue(selectBuilder);
      postRepository.create.mockImplementation((input) =>
        Object.assign(new BlogPost(), input, { id: 'new-post-id' }),
      );
      postRepository.save.mockImplementation((entity) =>
        Promise.resolve(Object.assign(new BlogPost(), entity)),
      );

      const app = await Test.createTestingModule({
        providers: [
          BlogPostsService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
          { provide: getRepositoryToken(BlogPost), useValue: postRepository },
          {
            provide: getRepositoryToken(BlogAuthor),
            useValue: authorRepository,
          },
          { provide: getRepositoryToken(BlogTag), useValue: tagRepository },
        ],
      }).compile();

      service = app.get<BlogPostsService>(BlogPostsService);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('createPost', () => {
      const draft = {
        bodyMarkdown: '# Hello',
        slug: 'hello-world',
        title: 'Hello world',
      };

      it('creates a DRAFT with no author and returns it reloaded', async () => {
        const created = buildPost({ id: 'new-post-id', slug: 'hello-world' });
        reloadReturns(created);

        const result = await service.createPost(draft, EDITOR);

        expect(postRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authorId: null,
            slug: 'hello-world',
            status: BLOG_POST_STATUS.DRAFT,
          }),
        );
        expect(result).toEqual({
          kind: BLOG_WRITE_RESULT_KIND.OK,
          value: created,
        });
      });

      it('never sets published_at on creation', async () => {
        reloadReturns(buildPost());

        await service.createPost(draft, EDITOR);

        const input = postRepository.create.mock.calls[0]?.[0];
        expect(input).not.toHaveProperty('publishedAt');
      });

      it('resolves the author slug to the author id', async () => {
        const author = blogAuthorsFactory.build({ slug: 'ada' });
        authorRepository.findOneBy.mockResolvedValue(
          Object.assign(new BlogAuthor(), author),
        );
        reloadReturns(buildPost());

        await service.createPost({ ...draft, authorSlug: 'ada' }, EDITOR);

        expect(authorRepository.findOneBy).toHaveBeenCalledWith({
          slug: 'ada',
        });
        expect(postRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ authorId: author.id }),
        );
      });

      it('returns not-found for an unknown author slug without saving', async () => {
        authorRepository.findOneBy.mockResolvedValue(null);

        const result = await service.createPost(
          { ...draft, authorSlug: 'nobody' },
          EDITOR,
        );

        expect(result).toEqual({
          entity: BLOG_WRITE_ENTITY.AUTHOR,
          key: 'nobody',
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
        expect(postRepository.save).not.toHaveBeenCalled();
      });

      it('returns a slug-conflict result (not a thrown 23505) when the slug is taken', async () => {
        postRepository.save.mockRejectedValue(uniqueViolation());

        const result = await service.createPost(draft, EDITOR);

        expect(result).toEqual({
          kind: BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT,
          slug: 'hello-world',
        });
      });

      it('rethrows errors that are not unique violations', async () => {
        postRepository.save.mockRejectedValue(new Error('connection reset'));

        await expect(service.createPost(draft, EDITOR)).rejects.toThrow(
          'connection reset',
        );
      });

      it.each(['Bad Slug', 'UPPER', '-x', 'x-', 'a--b', ''])(
        'rejects the malformed slug %j before touching the database',
        async (slug) => {
          await expect(
            service.createPost({ ...draft, slug }, EDITOR),
          ).rejects.toThrow(BadRequestException);
          expect(postRepository.save).not.toHaveBeenCalled();
        },
      );

      it('rejects a blank title', async () => {
        await expect(
          service.createPost({ ...draft, title: '   ' }, EDITOR),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('createPost: last_edited_by and the cover alt rule', () => {
      const draft = {
        bodyMarkdown: '# Hello',
        slug: 'hello-world',
        title: 'Hello world',
      };
      const COVER = 'https://cdn.example.test/cover.png';

      it('stores the caller identity as last_edited_by', async () => {
        reloadReturns(buildPost());

        await service.createPost(draft, EDITOR);

        expect(postRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ lastEditedBy: EDITOR }),
        );
      });

      it('stores a null caller identity as null', async () => {
        reloadReturns(buildPost());

        await service.createPost(draft, null);

        expect(postRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ lastEditedBy: null }),
        );
      });

      it.each([
        ['no alt at all', { coverImageUrl: COVER }],
        ['a null alt', { coverImageAlt: null, coverImageUrl: COVER }],
        ['a blank alt', { coverImageAlt: '  ', coverImageUrl: COVER }],
      ])(
        'returns cover-alt-required for a cover URL with %s',
        async (_n, cover) => {
          const result = await service.createPost(
            { ...draft, ...cover },
            EDITOR,
          );

          expect(result).toEqual({
            kind: BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED,
          });
          expect(postRepository.create).not.toHaveBeenCalled();
          expect(postRepository.save).not.toHaveBeenCalled();
        },
      );

      it('accepts a cover URL with alt text', async () => {
        reloadReturns(buildPost());

        const result = await service.createPost(
          { ...draft, coverImageAlt: 'A chart', coverImageUrl: COVER },
          EDITOR,
        );

        expect(result.kind).toBe(BLOG_WRITE_RESULT_KIND.OK);
      });

      it('accepts a post with no cover image', async () => {
        reloadReturns(buildPost());

        expect((await service.createPost(draft, EDITOR)).kind).toBe(
          BLOG_WRITE_RESULT_KIND.OK,
        );
      });
    });

    describe('updatePost', () => {
      /** Returns the columns the single UPDATE was asked to write. */
      const written = (): unknown => {
        return set.mock.calls[0]?.[0];
      };

      it('returns not-found for an unknown post id', async () => {
        postRepository.findOneBy.mockResolvedValue(null);

        const result = await service.updatePost(
          'missing',
          { title: 'x' },
          EDITOR,
        );

        expect(result).toEqual({
          entity: BLOG_WRITE_ENTITY.POST,
          key: 'missing',
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
        expect(execute).not.toHaveBeenCalled();
      });

      it('writes only the provided columns plus last_edited_by; null clears, undefined is untouched', async () => {
        const post = buildPost({ coverImageAlt: null, coverImageUrl: null });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.updatePost(
          post.id,
          { excerpt: null, seoTitle: undefined, title: 'New title' },
          EDITOR,
        );

        expect(written()).toEqual({
          excerpt: null,
          lastEditedBy: EDITOR,
          title: 'New title',
        });
        expect(where).toHaveBeenCalledWith('id = :id', { id: post.id });
      });

      it('never writes status or published_at', async () => {
        const post = buildPost({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.updatePost(post.id, { title: 'Retitled' }, EDITOR);

        expect(written()).not.toHaveProperty('status');
        expect(written()).not.toHaveProperty('publishedAt');
      });

      it('returns the reloaded post on success', async () => {
        const post = buildPost();
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        expect(
          await service.updatePost(post.id, { title: 'x' }, EDITOR),
        ).toEqual({
          kind: BLOG_WRITE_RESULT_KIND.OK,
          value: post,
        });
      });

      it('returns a slug-conflict result when re-slugging onto another post', async () => {
        const post = buildPost();
        postRepository.findOneBy.mockResolvedValue(post);
        execute.mockRejectedValue(uniqueViolation());

        const result = await service.updatePost(
          post.id,
          { slug: 'taken-slug' },
          EDITOR,
        );

        expect(result).toEqual({
          kind: BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT,
          slug: 'taken-slug',
        });
      });

      it('rethrows errors that are not unique violations', async () => {
        postRepository.findOneBy.mockResolvedValue(buildPost());
        execute.mockRejectedValue(new Error('connection reset'));

        await expect(
          service.updatePost('id', { title: 'x' }, EDITOR),
        ).rejects.toThrow('connection reset');
      });

      it('clears the author when authorSlug is null', async () => {
        const post = buildPost({ authorId: 'some-author' });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.updatePost(post.id, { authorSlug: null }, EDITOR);

        expect(written()).toEqual({ authorId: null, lastEditedBy: EDITOR });
      });

      it('returns not-found for an unknown author slug', async () => {
        postRepository.findOneBy.mockResolvedValue(buildPost());
        authorRepository.findOneBy.mockResolvedValue(null);

        const result = await service.updatePost(
          'id',
          { authorSlug: 'ghost' },
          EDITOR,
        );

        expect(result).toMatchObject({
          entity: BLOG_WRITE_ENTITY.AUTHOR,
          key: 'ghost',
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
        expect(execute).not.toHaveBeenCalled();
      });

      it('rejects a malformed slug and a blank title up front', async () => {
        await expect(
          service.updatePost('id', { slug: 'Not Valid' }, EDITOR),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.updatePost('id', { title: '' }, EDITOR),
        ).rejects.toThrow(BadRequestException);
        expect(postRepository.findOneBy).not.toHaveBeenCalled();
      });

      describe('cover alt rule on the resulting post', () => {
        const COVER = 'https://cdn.example.test/cover.png';
        const withCover = (): BlogPost => {
          return buildPost({ coverImageAlt: 'A chart', coverImageUrl: COVER });
        };

        it('rejects a patch that clears the alt while the stored cover URL stays', async () => {
          postRepository.findOneBy.mockResolvedValue(withCover());

          const result = await service.updatePost(
            'id',
            { coverImageAlt: null },
            EDITOR,
          );

          expect(result).toEqual({
            kind: BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED,
          });
          expect(execute).not.toHaveBeenCalled();
        });

        it('rejects a patch that blanks the alt', async () => {
          postRepository.findOneBy.mockResolvedValue(withCover());

          expect(
            await service.updatePost('id', { coverImageAlt: '  ' }, EDITOR),
          ).toEqual({ kind: BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED });
        });

        it('rejects a patch that sets a cover URL on a post that has no alt', async () => {
          postRepository.findOneBy.mockResolvedValue(
            buildPost({ coverImageAlt: null, coverImageUrl: null }),
          );

          const result = await service.updatePost(
            'id',
            { coverImageUrl: COVER },
            EDITOR,
          );

          expect(result).toEqual({
            kind: BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED,
          });
          expect(execute).not.toHaveBeenCalled();
        });

        it('accepts a patch that sets the URL and the alt together', async () => {
          const post = buildPost({ coverImageAlt: null, coverImageUrl: null });
          postRepository.findOneBy.mockResolvedValue(post);
          reloadReturns(post);

          const result = await service.updatePost(
            post.id,
            { coverImageAlt: 'A chart', coverImageUrl: COVER },
            EDITOR,
          );

          expect(result.kind).toBe(BLOG_WRITE_RESULT_KIND.OK);
          expect(written()).toMatchObject({
            coverImageAlt: 'A chart',
            coverImageUrl: COVER,
          });
        });

        it('accepts clearing the cover URL (an orphan alt is harmless)', async () => {
          const post = withCover();
          postRepository.findOneBy.mockResolvedValue(post);
          reloadReturns(post);

          expect(
            (await service.updatePost(post.id, { coverImageUrl: null }, EDITOR))
              .kind,
          ).toBe(BLOG_WRITE_RESULT_KIND.OK);
        });

        it('accepts an unrelated patch on a post that already has cover and alt', async () => {
          const post = withCover();
          postRepository.findOneBy.mockResolvedValue(post);
          reloadReturns(post);

          expect(
            (await service.updatePost(post.id, { title: 'Retitled' }, EDITOR))
              .kind,
          ).toBe(BLOG_WRITE_RESULT_KIND.OK);
        });
      });

      describe('stale-write check (expectedUpdatedAt)', () => {
        const READ_AT = new Date('2026-10-11T11:00:00.123Z');
        const BUMPED_AT = new Date('2026-10-11T11:30:00.456Z');

        it('puts the comparison in the UPDATE WHERE clause, truncated to milliseconds', async () => {
          const post = buildPost({ updatedAt: READ_AT });
          postRepository.findOneBy.mockResolvedValue(post);
          reloadReturns(post);

          await service.updatePost(post.id, { title: 'x' }, EDITOR, READ_AT);

          expect(andWhere).toHaveBeenCalledExactlyOnceWith(
            "date_trunc('milliseconds', updated_at) = CAST(:expectedUpdatedAt AS timestamptz)",
            { expectedUpdatedAt: READ_AT },
          );
        });

        it('adds no updated_at condition when expectedUpdatedAt is omitted or null', async () => {
          const post = buildPost();
          postRepository.findOneBy.mockResolvedValue(post);
          reloadReturns(post);

          await service.updatePost(post.id, { title: 'x' }, EDITOR);
          await service.updatePost(post.id, { title: 'x' }, EDITOR, null);

          expect(andWhere).not.toHaveBeenCalled();
        });

        it('returns stale-write with the current updatedAt when no row matched', async () => {
          const post = buildPost({ updatedAt: READ_AT });
          postRepository.findOneBy
            .mockResolvedValueOnce(post)
            .mockResolvedValueOnce(buildPost({ updatedAt: BUMPED_AT }));
          execute.mockResolvedValue({
            affected: 0,
            generatedMaps: [],
            raw: [],
          });

          const result = await service.updatePost(
            post.id,
            { title: 'x' },
            EDITOR,
            READ_AT,
          );

          expect(result).toEqual({
            currentUpdatedAt: BUMPED_AT,
            kind: BLOG_WRITE_RESULT_KIND.STALE_WRITE,
          });
          expect(postRepository.findOne).not.toHaveBeenCalled();
        });

        it('returns not-found when no row matched because the post is gone', async () => {
          postRepository.findOneBy
            .mockResolvedValueOnce(buildPost())
            .mockResolvedValueOnce(null);
          execute.mockResolvedValue({
            affected: 0,
            generatedMaps: [],
            raw: [],
          });

          const result = await service.updatePost(
            'gone',
            { title: 'x' },
            EDITOR,
            READ_AT,
          );

          expect(result).toEqual({
            entity: BLOG_WRITE_ENTITY.POST,
            key: 'gone',
            kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
          });
        });

        it('lets exactly one of two concurrent writers holding the same updatedAt win', async () => {
          // A one-row "database": the UPDATE is a single compare-and-set against the stored
          // updated_at, exactly what the WHERE clause does server-side. Both writers read the
          // row BEFORE either writes, so a read-then-write check would let both through.
          const stored = buildPost({ title: 'Original', updatedAt: READ_AT });
          const snapshot = (): BlogPost => {
            return Object.assign(new BlogPost(), stored);
          };
          postRepository.findOneBy.mockImplementation(() =>
            Promise.resolve(snapshot()),
          );
          reloadReturns(stored);

          let expected: Date | null = null;
          andWhere.mockImplementation((_sql: string, params: unknown) => {
            expected = null;
            if (
              typeof params === 'object' &&
              params !== null &&
              'expectedUpdatedAt' in params &&
              params.expectedUpdatedAt instanceof Date
            ) {
              expected = params.expectedUpdatedAt;
            }
            return updateBuilder;
          });
          set.mockImplementation((columns: Partial<BlogPost>) => {
            Object.assign(pending, columns);
            return updateBuilder;
          });
          const pending: Partial<BlogPost> = {};
          execute.mockImplementation(() => {
            if (expected?.getTime() !== stored.updatedAt.getTime()) {
              return Promise.resolve({
                affected: 0,
                generatedMaps: [],
                raw: [],
              });
            }
            Object.assign(stored, pending, { updatedAt: BUMPED_AT });
            return Promise.resolve({ affected: 1, generatedMaps: [], raw: [] });
          });

          const results = await Promise.all([
            service.updatePost(stored.id, { title: 'A' }, 'writer-a', READ_AT),
            service.updatePost(stored.id, { title: 'B' }, 'writer-b', READ_AT),
          ]);

          const kinds = results.map((result) => result.kind).sort();
          expect(kinds).toEqual([
            BLOG_WRITE_RESULT_KIND.OK,
            BLOG_WRITE_RESULT_KIND.STALE_WRITE,
          ]);
          expect(results).toContainEqual({
            currentUpdatedAt: BUMPED_AT,
            kind: BLOG_WRITE_RESULT_KIND.STALE_WRITE,
          });
          expect(stored.title).toBe('A');
          expect(stored.lastEditedBy).toBe('writer-a');
        });
      });
    });

    describe('publishPost', () => {
      const written = (): unknown => {
        return set.mock.calls[0]?.[0];
      };

      it('stamps now() when no publishedAt is given', async () => {
        const post = buildPost();
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR);

        expect(written()).toEqual({
          lastEditedBy: EDITOR,
          publishedAt: NOW,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
      });

      it('stamps now() when publishedAt is explicitly null', async () => {
        const post = buildPost();
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR, null);

        expect(written()).toMatchObject({ publishedAt: NOW });
      });

      it('schedules a future publishedAt: PUBLISHED with that exact future date', async () => {
        const post = buildPost();
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR, FUTURE);

        expect(written()).toMatchObject({
          publishedAt: FUTURE,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        expect(FUTURE.getTime()).toBeGreaterThan(Date.now());
      });

      it('honours an explicit past publishedAt (backdating)', async () => {
        const post = buildPost();
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR, PAST);

        expect(written()).toMatchObject({ publishedAt: PAST });
      });

      it('keeps the original date when re-publishing an already published post', async () => {
        const post = buildPost({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR);

        expect(written()).toMatchObject({ publishedAt: PAST });
      });

      it('keeps the date of a post whose publishedAt is exactly now (LIVE boundary)', async () => {
        const post = buildPost({
          publishedAt: new Date(NOW),
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR);

        expect(written()).toMatchObject({ publishedAt: NOW });
      });

      it('goes live now when a scheduled (future-dated) post is published without a date', async () => {
        const post = buildPost({
          publishedAt: FUTURE,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR);

        expect(written()).toMatchObject({ publishedAt: NOW });
      });

      it('stamps now() when publishing an archived post without a date', async () => {
        const post = buildPost({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.ARCHIVED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.publishPost(post.id, EDITOR);

        expect(written()).toMatchObject({
          publishedAt: NOW,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
      });

      it('returns not-found for an unknown post', async () => {
        postRepository.findOneBy.mockResolvedValue(null);

        expect(await service.publishPost('missing', EDITOR)).toMatchObject({
          entity: BLOG_WRITE_ENTITY.POST,
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
        expect(execute).not.toHaveBeenCalled();
      });
    });

    describe('unpublishPost / archivePost', () => {
      const written = (): unknown => {
        return set.mock.calls[0]?.[0];
      };

      it('unpublish returns the post to DRAFT, clears published_at and records the editor', async () => {
        const post = buildPost({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.unpublishPost(post.id, EDITOR);

        expect(written()).toEqual({
          lastEditedBy: EDITOR,
          publishedAt: null,
          status: BLOG_POST_STATUS.DRAFT,
        });
      });

      it('archive sets ARCHIVED, retains published_at and records the editor', async () => {
        const post = buildPost({
          publishedAt: PAST,
          status: BLOG_POST_STATUS.PUBLISHED,
        });
        postRepository.findOneBy.mockResolvedValue(post);
        reloadReturns(post);

        await service.archivePost(post.id, null);

        expect(written()).toEqual({
          lastEditedBy: null,
          status: BLOG_POST_STATUS.ARCHIVED,
        });
      });

      it.each([
        ['unpublishPost', () => service.unpublishPost('missing', EDITOR)],
        ['archivePost', () => service.archivePost('missing', EDITOR)],
      ])('%s returns not-found for an unknown post', async (_name, run) => {
        postRepository.findOneBy.mockResolvedValue(null);

        expect(await run()).toMatchObject({
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
        expect(execute).not.toHaveBeenCalled();
      });
    });

    describe('setPostTags', () => {
      it('replaces the tag set with the tags found for the de-duplicated slugs', async () => {
        const post = buildPost();
        const tags = [
          Object.assign(new BlogTag(), blogTagsFactory.build({ slug: 'ops' })),
          Object.assign(new BlogTag(), blogTagsFactory.build({ slug: 'news' })),
        ];
        postRepository.findOne.mockResolvedValue(post);
        tagRepository.findBy.mockResolvedValue(tags);

        await service.setPostTags(post.id, ['ops', 'news', 'ops'], EDITOR);

        expect(tagRepository.findBy).toHaveBeenCalledTimes(1);
        expect(postRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ tags }),
        );
      });

      it('stamps last_edited_by with an UPDATE even though only the join table changed', async () => {
        const post = buildPost();
        postRepository.findOne.mockResolvedValue(post);

        await service.setPostTags(post.id, [], EDITOR);

        expect(set).toHaveBeenCalledExactlyOnceWith({ lastEditedBy: EDITOR });
        expect(where).toHaveBeenCalledWith('id = :id', { id: post.id });
      });

      it('clears all tags for an empty list without querying tags', async () => {
        const post = buildPost({
          tags: [Object.assign(new BlogTag(), blogTagsFactory.build())],
        });
        postRepository.findOne.mockResolvedValue(post);

        await service.setPostTags(post.id, [], EDITOR);

        expect(tagRepository.findBy).not.toHaveBeenCalled();
        expect(postRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ tags: [] }),
        );
      });

      it('returns not-found naming the missing tag slug and does not save', async () => {
        postRepository.findOne.mockResolvedValue(buildPost());
        tagRepository.findBy.mockResolvedValue([
          Object.assign(new BlogTag(), blogTagsFactory.build({ slug: 'ops' })),
        ]);

        const result = await service.setPostTags(
          'id',
          ['ops', 'ghost'],
          EDITOR,
        );

        expect(result).toEqual({
          entity: BLOG_WRITE_ENTITY.TAG,
          key: 'ghost',
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
        expect(postRepository.save).not.toHaveBeenCalled();
        expect(execute).not.toHaveBeenCalled();
      });

      it('returns not-found for an unknown post', async () => {
        postRepository.findOne.mockResolvedValue(null);

        expect(
          await service.setPostTags('missing', ['ops'], EDITOR),
        ).toMatchObject({
          entity: BLOG_WRITE_ENTITY.POST,
          kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
        });
      });

      it('rejects a malformed tag slug', async () => {
        await expect(
          service.setPostTags('id', ['Bad Tag'], EDITOR),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('findStatusById', () => {
      it.each([
        BLOG_POST_STATUS.DRAFT,
        BLOG_POST_STATUS.PUBLISHED,
        BLOG_POST_STATUS.ARCHIVED,
      ])('returns %s for a post with that status', async (status) => {
        postRepository.findOne.mockResolvedValue(buildPost({ status }));

        expect(await service.findStatusById('id')).toBe(status);
        expect(postRepository.findOne).toHaveBeenCalledWith({
          select: { id: true, status: true },
          where: { id: 'id' },
        });
      });

      it('returns null for an unknown post', async () => {
        postRepository.findOne.mockResolvedValue(null);

        expect(await service.findStatusById('missing')).toBeNull();
      });
    });

    describe('findAdminPost', () => {
      it('looks a post up by id, in any state', async () => {
        const post = buildPost({ status: BLOG_POST_STATUS.DRAFT });
        postRepository.findOne.mockResolvedValue(post);

        expect(await service.findAdminPost({ id: post.id })).toBe(post);
        expect(postRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: post.id } }),
        );
      });

      it('looks a post up by slug', async () => {
        postRepository.findOne.mockResolvedValue(buildPost());

        await service.findAdminPost({ slug: 'my-slug' });

        expect(postRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({ where: { slug: 'my-slug' } }),
        );
      });

      it('returns null when nothing matches', async () => {
        postRepository.findOne.mockResolvedValue(null);

        expect(await service.findAdminPost({ id: 'nope' })).toBeNull();
      });
    });
  });
});
