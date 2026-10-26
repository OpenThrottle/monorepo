import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Repository } from 'typeorm';

import { toLikeContainsPattern } from '../../utils/like-pattern.ts';
import { resolveListPagination } from '../../utils/list-pagination.ts';
import { isUniqueViolation } from '../../utils/unique-violation.ts';
import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import type { BlogPostStatus } from './blog-post.constants.ts';
import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import { BlogPost } from './blog-post.entity.ts';
import {
  decodeBlogPostAdminCursor,
  decodeBlogPostCursor,
  encodeBlogPostAdminCursor,
  encodeBlogPostCursor,
} from './blog-post-cursor.ts';
import type { BlogPostState } from './blog-post-visibility.ts';
import {
  applyBlogPostStateFilter,
  applyBlogPostVisibility,
  BLOG_POST_STATE,
  deriveBlogPostState,
} from './blog-post-visibility.ts';
import type {
  BlogPostWriteResult,
  BlogWriteNotFound,
  BlogWriteOk,
} from './blog-write-result.ts';
import {
  BLOG_WRITE_ENTITY,
  BLOG_WRITE_RESULT_KIND,
  blogWriteCoverAltRequired,
  blogWriteNotFound,
  blogWriteOk,
  blogWriteSlugConflict,
  blogWriteStaleWrite,
} from './blog-write-result.ts';
import {
  assertBlogSlug,
  assertNotBlank,
  isCoverAltMissing,
} from './blog-write-validation.ts';

/**
 * Input for {@link BlogPostsService.findPublished}.
 * @public
 */
export interface FindPublishedBlogPostsInput {
  /** Opaque cursor from a previous page's `endCursor`; omit for the first page. */
  readonly after?: string | null;
  /** Page size, clamped to `[1, LIST_PAGINATION_MAX_LIMIT]`. */
  readonly first: number;
  /** Only posts carrying the tag with this slug. */
  readonly tagSlug?: string | null;
}

/**
 * One page of publicly visible posts, newest first.
 * @public
 */
export interface BlogPostPage {
  /** Cursor of the last item, or `null` when the page is empty. */
  readonly endCursor: string | null;
  readonly hasNextPage: boolean;
  /** Posts with `author` and `tags` (all of each post's tags) loaded. */
  readonly items: readonly BlogPost[];
}

/**
 * Input for {@link BlogPostsService.createPost}. Posts are always created as DRAFT; go live
 * with {@link BlogPostsService.publishPost}.
 * @public
 */
export interface BlogPostDraftInput {
  /** Slug of an existing author; omit or `null` for no byline. */
  readonly authorSlug?: string | null;
  readonly bodyMarkdown: string;
  readonly coverImageAlt?: string | null;
  readonly coverImageUrl?: string | null;
  readonly excerpt?: string | null;
  readonly seoDescription?: string | null;
  readonly seoTitle?: string | null;
  readonly slug: string;
  readonly title: string;
}

/**
 * Partial update for {@link BlogPostsService.updatePost}. A property that is `undefined` (or
 * omitted) is left unchanged; `null` clears a nullable column. Status and `published_at` are
 * not patchable — use the publish / unpublish / archive transitions.
 * @public
 */
export interface BlogPostPatch {
  readonly authorSlug?: string | null;
  readonly bodyMarkdown?: string;
  readonly coverImageAlt?: string | null;
  readonly coverImageUrl?: string | null;
  readonly excerpt?: string | null;
  readonly seoDescription?: string | null;
  readonly seoTitle?: string | null;
  readonly slug?: string;
  readonly title?: string;
}

/**
 * Input for {@link BlogPostsService.findAdminPosts}.
 * @public
 */
export interface FindAdminBlogPostsInput {
  /** Opaque cursor from a previous page's `endCursor`; omit for the first page. */
  readonly after?: string | null;
  /** Page size, clamped to `[1, LIST_PAGINATION_MAX_LIMIT]`. */
  readonly first: number;
  /** Case-insensitive substring match on title OR slug; blank means no search. */
  readonly search?: string | null;
  /** Only posts in one of these derived states; omit or empty for every post. */
  readonly states?: readonly BlogPostState[] | null;
}

/**
 * Lookup for {@link BlogPostsService.findAdminPost}: by id or by slug.
 * @public
 */
export type FindAdminBlogPostInput =
  { readonly id: string } | { readonly slug: string };

/**
 * Column changes a write can make. Only the keys present are written, so a concurrent edit to
 * an untouched column is never overwritten.
 */
type BlogPostColumnChanges = Partial<
  Pick<
    BlogPost,
    | 'authorId'
    | 'bodyMarkdown'
    | 'coverImageAlt'
    | 'coverImageUrl'
    | 'excerpt'
    | 'publishedAt'
    | 'seoDescription'
    | 'seoTitle'
    | 'slug'
    | 'status'
    | 'title'
  >
>;

interface BlogPostKeyRow {
  readonly cursorPublishedAt: string;
  readonly id: string;
}

interface BlogPostAdminKeyRow {
  readonly cursorUpdatedAt: string;
  readonly id: string;
}

/** Timestamp at full microsecond precision, as ISO-8601 UTC text. */
const cursorTimestampSql = (column: string): string =>
  `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const CURSOR_PUBLISHED_AT_SQL = cursorTimestampSql('post.publishedAt');
const CURSOR_UPDATED_AT_SQL = cursorTimestampSql('post.updatedAt');

/**
 * `updated_at` compared at millisecond precision. Postgres stores microseconds but a JS `Date`
 * (what the caller round-trips as `expectedUpdatedAt`) holds milliseconds, and the pg driver
 * truncates on read; truncating the column the same way makes a round-tripped value match.
 */
const UPDATED_AT_MATCHES_EXPECTED_SQL = `date_trunc('milliseconds', updated_at) = CAST(:expectedUpdatedAt AS timestamptz)`;

/** @public */
@Injectable()
export class BlogPostsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogAuthor)
    private readonly blogAuthorRepository: Repository<BlogAuthor>,
    @InjectRepository(BlogTag)
    private readonly blogTagRepository: Repository<BlogTag>,
  ) {
    this.logger.debug('🧩 blog-posts 🧩');
  }

  /**
   * @description Returns the TypeORM repository for blog posts. Use for admin/CRUD
   * paths only — public reads must go through {@link findPublished} /
   * {@link findPublishedBySlug}, which apply the visibility rule.
   */
  getRepository(): Repository<BlogPost> {
    return this.blogPostRepository;
  }

  /**
   * @description Publicly visible posts, newest first, with keyset pagination on
   * `(published_at DESC, id DESC)` so pages stay stable across equal `published_at`
   * values. Runs two queries regardless of page size: one for the page's keys (fetching
   * `first + 1` to derive `hasNextPage`), one to hydrate `author` and `tags`.
   * The tag filter is an EXISTS, so each returned post still carries all its tags.
   * @throws BadRequestException when `after` is not a cursor this service produced.
   * @public
   */
  async findPublished(
    input: FindPublishedBlogPostsInput,
  ): Promise<BlogPostPage> {
    const { take } = resolveListPagination({ limit: input.first });
    const cursor =
      input.after == null ? null : decodeBlogPostCursor(input.after);
    if (input.after != null && cursor == null) {
      throw new BadRequestException('Invalid pagination cursor.');
    }

    const query = applyBlogPostVisibility(
      this.blogPostRepository
        .createQueryBuilder('post')
        .select('post.id', 'id')
        .addSelect(CURSOR_PUBLISHED_AT_SQL, 'cursorPublishedAt'),
      'post',
    );

    if (input.tagSlug != null) {
      const tagged = query
        .subQuery()
        .select('1')
        .from(BlogTag, 'tag')
        .innerJoin('tag.posts', 'taggedPost')
        .where('taggedPost.id = post.id')
        .andWhere('tag.slug = :tagSlug')
        .getQuery();
      query.andWhere(`EXISTS ${tagged}`, { tagSlug: input.tagSlug });
    }

    if (cursor != null) {
      query.andWhere(
        '(post.publishedAt, post.id) < (CAST(:cursorPublishedAt AS timestamptz), CAST(:cursorId AS uuid))',
        { cursorId: cursor.id, cursorPublishedAt: cursor.publishedAt },
      );
    }

    const rows = await query
      .orderBy('post.publishedAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .limit(take + 1)
      .getRawMany<BlogPostKeyRow>();

    const pageRows = rows.slice(0, take);
    const lastRow = pageRows[pageRows.length - 1];
    if (lastRow == null) {
      return { endCursor: null, hasNextPage: false, items: [] };
    }

    return {
      endCursor: encodeBlogPostCursor({
        id: lastRow.id,
        publishedAt: lastRow.cursorPublishedAt,
      }),
      hasNextPage: rows.length > take,
      items: await this.hydratePosts(pageRows.map((row) => row.id)),
    };
  }

  /**
   * @description One publicly visible post by slug (with `author` and `tags`), or `null`
   * when it does not exist or is not visible (draft, archived, future-scheduled).
   * @public
   */
  async findPublishedBySlug(slug: string): Promise<BlogPost | null> {
    return applyBlogPostVisibility(
      this.blogPostRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.tags', 'tag')
        .where('post.slug = :slug', { slug }),
      'post',
    )
      .orderBy('tag.name', 'ASC')
      .getOne();
  }

  /**
   * @description Admin list: every post (drafts, scheduled, archived included — the public
   * visibility rule is not applied), most recently edited first, with keyset pagination on
   * `(updated_at DESC, id DESC)` so pages stay stable across equal `updated_at` values. Same
   * two-query shape as {@link findPublished}. `states` is translated to SQL by
   * {@link applyBlogPostStateFilter}; `search` is a case-insensitive substring match on title OR
   * slug (LIKE wildcards in the term are matched literally).
   * @throws BadRequestException when `after` is not a cursor this service produced.
   * @public
   */
  async findAdminPosts(input: FindAdminBlogPostsInput): Promise<BlogPostPage> {
    const { take } = resolveListPagination({ limit: input.first });
    const cursor =
      input.after == null ? null : decodeBlogPostAdminCursor(input.after);
    if (input.after != null && cursor == null) {
      throw new BadRequestException('Invalid pagination cursor.');
    }

    const query = applyBlogPostStateFilter(
      this.blogPostRepository
        .createQueryBuilder('post')
        .select('post.id', 'id')
        .addSelect(CURSOR_UPDATED_AT_SQL, 'cursorUpdatedAt'),
      'post',
      input.states ?? [],
    );

    const term = input.search?.trim() ?? '';
    if (term.length > 0) {
      query.andWhere('(post.title ILIKE :search OR post.slug ILIKE :search)', {
        search: toLikeContainsPattern(term),
      });
    }

    if (cursor != null) {
      query.andWhere(
        '(post.updatedAt, post.id) < (CAST(:cursorUpdatedAt AS timestamptz), CAST(:cursorId AS uuid))',
        { cursorId: cursor.id, cursorUpdatedAt: cursor.updatedAt },
      );
    }

    const rows = await query
      .orderBy('post.updatedAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .limit(take + 1)
      .getRawMany<BlogPostAdminKeyRow>();

    const pageRows = rows.slice(0, take);
    const lastRow = pageRows[pageRows.length - 1];
    if (lastRow == null) {
      return { endCursor: null, hasNextPage: false, items: [] };
    }

    return {
      endCursor: encodeBlogPostAdminCursor({
        id: lastRow.id,
        updatedAt: lastRow.cursorUpdatedAt,
      }),
      hasNextPage: rows.length > take,
      items: await this.hydratePosts(pageRows.map((row) => row.id)),
    };
  }

  /**
   * @description One post by id or slug in ANY state (with `author` and `tags`), or `null`
   * when it does not exist. Admin read: the public visibility rule is not applied.
   * @public
   */
  async findAdminPost(input: FindAdminBlogPostInput): Promise<BlogPost | null> {
    return this.blogPostRepository.findOne({
      order: { tags: { name: 'ASC' } },
      relations: { author: true, tags: true },
      where: 'id' in input ? { id: input.id } : { slug: input.slug },
    });
  }

  /**
   * @description The stored status of a post, or `null` when it does not exist. A cheap
   * single-column lookup so a resolver can apply the status-dependent permission rule (a
   * non-DRAFT post needs `blog:write`) BEFORE it writes. The write itself still re-reads the
   * row; a status change in between is the caller's race to accept or guard with
   * `expectedUpdatedAt`.
   * @public
   */
  async findStatusById(id: string): Promise<BlogPostStatus | null> {
    const post = await this.blogPostRepository.findOne({
      select: { id: true, status: true },
      where: { id },
    });
    return post?.status ?? null;
  }

  /**
   * @description Creates a DRAFT post. Admin write path: the public visibility rule is not
   * applied. The slug is validated against the DB CHECK shape first, so a malformed slug is a
   * `BadRequestException` rather than a constraint violation; a slug another post already uses
   * (unique index `idx_blog_posts_slug`, including a race with a concurrent insert) comes back
   * as a `slug-conflict` result, never a thrown 23505. A cover URL without cover alt text is a
   * `cover-alt-required` result and nothing is written.
   * @param editedBy - Caller identity stored as `last_edited_by` (user display name or service
   * account name); `null` when unknown.
   * @throws BadRequestException on a malformed slug or blank title.
   * @public
   */
  async createPost(
    input: BlogPostDraftInput,
    editedBy: string | null,
  ): Promise<BlogPostWriteResult> {
    assertBlogSlug(input.slug);
    assertNotBlank(input.title, 'title');
    if (isCoverAltMissing(input)) return blogWriteCoverAltRequired();

    const author = await this.resolveAuthorId(input.authorSlug);
    if (author.kind !== BLOG_WRITE_RESULT_KIND.OK) return author;

    try {
      const saved = await this.blogPostRepository.save(
        this.blogPostRepository.create({
          authorId: author.value,
          bodyMarkdown: input.bodyMarkdown,
          coverImageAlt: input.coverImageAlt ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          excerpt: input.excerpt ?? null,
          lastEditedBy: editedBy,
          seoDescription: input.seoDescription ?? null,
          seoTitle: input.seoTitle ?? null,
          slug: input.slug,
          status: BLOG_POST_STATUS.DRAFT,
          title: input.title,
        }),
      );
      return await this.reloadPost(saved.id);
    } catch (error) {
      if (isUniqueViolation(error)) return blogWriteSlugConflict(input.slug);
      throw error;
    }
  }

  /**
   * @description Applies a partial update (see {@link BlogPostPatch}). Same slug handling as
   * {@link createPost}: re-slugging onto another post's slug is a `slug-conflict` result.
   * The post that RESULTS from the patch (stored row with the patch merged on top) must not
   * have a cover URL without alt text, else `cover-alt-required` and nothing is written.
   *
   * With `expectedUpdatedAt` the write is optimistic-locked atomically in the UPDATE's WHERE
   * clause (no read-then-write window): if the row's `updated_at` (compared at millisecond
   * precision) differs, nothing is written and the result is `stale-write` carrying the current
   * `updated_at`. Only the patched columns (plus `last_edited_by`) are written.
   * @param editedBy - Caller identity stored as `last_edited_by`.
   * @param expectedUpdatedAt - The `updatedAt` the caller last read; omit to skip the check.
   * @throws BadRequestException on a malformed slug or blank title.
   * @public
   */
  async updatePost(
    id: string,
    patch: BlogPostPatch,
    editedBy: string | null,
    expectedUpdatedAt?: Date | null,
  ): Promise<BlogPostWriteResult> {
    if (patch.slug !== undefined) assertBlogSlug(patch.slug);
    if (patch.title !== undefined) assertNotBlank(patch.title, 'title');

    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    const resulting = {
      coverImageAlt:
        patch.coverImageAlt === undefined
          ? post.coverImageAlt
          : patch.coverImageAlt,
      coverImageUrl:
        patch.coverImageUrl === undefined
          ? post.coverImageUrl
          : patch.coverImageUrl,
    };
    if (isCoverAltMissing(resulting)) return blogWriteCoverAltRequired();

    const changes: BlogPostColumnChanges = {};
    if (patch.authorSlug !== undefined) {
      const author = await this.resolveAuthorId(patch.authorSlug);
      if (author.kind !== BLOG_WRITE_RESULT_KIND.OK) return author;
      changes.authorId = author.value;
    }
    if (patch.bodyMarkdown !== undefined) {
      changes.bodyMarkdown = patch.bodyMarkdown;
    }
    if (patch.coverImageAlt !== undefined) {
      changes.coverImageAlt = patch.coverImageAlt;
    }
    if (patch.coverImageUrl !== undefined) {
      changes.coverImageUrl = patch.coverImageUrl;
    }
    if (patch.excerpt !== undefined) changes.excerpt = patch.excerpt;
    if (patch.seoDescription !== undefined) {
      changes.seoDescription = patch.seoDescription;
    }
    if (patch.seoTitle !== undefined) changes.seoTitle = patch.seoTitle;
    if (patch.slug !== undefined) changes.slug = patch.slug;
    if (patch.title !== undefined) changes.title = patch.title;

    return this.writePost(id, changes, editedBy, {
      expectedUpdatedAt: expectedUpdatedAt ?? null,
      slug: patch.slug ?? post.slug,
    });
  }

  /**
   * @description Publishes a post: status becomes PUBLISHED and `published_at` is set. With no
   * `publishedAt` the post goes live now (a post that is already LIVE keeps its original
   * date, so re-publishing never bumps it to the top of the feed; a post that is merely
   * scheduled goes live now instead); a future `publishedAt`
   * SCHEDULES it — status is PUBLISHED but the public visibility rule hides it until the
   * database clock reaches that date.
   * @param editedBy - Caller identity stored as `last_edited_by`.
   * @public
   */
  async publishPost(
    id: string,
    editedBy: string | null,
    publishedAt?: Date | null,
  ): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    const now = new Date();
    const alreadyLive = deriveBlogPostState(post, now) === BLOG_POST_STATE.LIVE;

    return this.writePost(
      id,
      {
        publishedAt: publishedAt ?? (alreadyLive ? post.publishedAt : now),
        status: BLOG_POST_STATUS.PUBLISHED,
      },
      editedBy,
      { expectedUpdatedAt: null, slug: post.slug },
    );
  }

  /**
   * @description Takes a post back to DRAFT and clears `published_at` (a later publish
   * stamps a fresh date). The post stops being publicly visible immediately.
   * @param editedBy - Caller identity stored as `last_edited_by`.
   * @public
   */
  async unpublishPost(
    id: string,
    editedBy: string | null,
  ): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    return this.writePost(
      id,
      { publishedAt: null, status: BLOG_POST_STATUS.DRAFT },
      editedBy,
      { expectedUpdatedAt: null, slug: post.slug },
    );
  }

  /**
   * @description Archives a post. `published_at` is retained as history; the post is no
   * longer publicly visible.
   * @param editedBy - Caller identity stored as `last_edited_by`.
   * @public
   */
  async archivePost(
    id: string,
    editedBy: string | null,
  ): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    return this.writePost(id, { status: BLOG_POST_STATUS.ARCHIVED }, editedBy, {
      expectedUpdatedAt: null,
      slug: post.slug,
    });
  }

  /**
   * @description Replaces the full set of tags on a post. `tagSlugs` are de-duplicated; an
   * empty list removes every tag. Returns `not-found` (entity `tag`, key = the slug) for the
   * first slug that has no tag, leaving the post untouched. A join-table-only change does not
   * touch the `blog_posts` row, so a follow-up UPDATE stamps `last_edited_by` (and, via the
   * `updated_at` trigger, `updated_at`) — a tag edit is a post edit for stale-write purposes.
   * @param editedBy - Caller identity stored as `last_edited_by`.
   * @throws BadRequestException when any slug is malformed.
   * @public
   */
  async setPostTags(
    postId: string,
    tagSlugs: readonly string[],
    editedBy: string | null,
  ): Promise<BlogPostWriteResult> {
    const slugs = [...new Set(tagSlugs)];
    for (const slug of slugs) assertBlogSlug(slug, 'tag slug');

    const post = await this.blogPostRepository.findOne({
      relations: { tags: true },
      where: { id: postId },
    });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, postId);

    const tags =
      slugs.length === 0
        ? []
        : await this.blogTagRepository.findBy({ slug: In(slugs) });
    const missing = slugs.find(
      (slug) => !tags.some((tag) => tag.slug === slug),
    );
    if (missing != null) {
      return blogWriteNotFound(BLOG_WRITE_ENTITY.TAG, missing);
    }

    post.tags = tags;
    await this.blogPostRepository.save(post);
    return this.writePost(postId, {}, editedBy, {
      expectedUpdatedAt: null,
      slug: post.slug,
    });
  }

  /** Resolves an author slug to its id; `null`/`undefined` means "no author". */
  private async resolveAuthorId(
    authorSlug: string | null | undefined,
  ): Promise<BlogWriteNotFound | BlogWriteOk<string | null>> {
    if (authorSlug == null) return blogWriteOk(null);

    const author = await this.blogAuthorRepository.findOneBy({
      slug: authorSlug,
    });
    return author == null
      ? blogWriteNotFound(BLOG_WRITE_ENTITY.AUTHOR, authorSlug)
      : blogWriteOk(author.id);
  }

  /**
   * UPDATEs `changes` plus `last_edited_by` on one row and returns it reloaded. A single
   * statement: when `expectedUpdatedAt` is set it is part of the WHERE clause, so the stale
   * check and the write are one atomic step. Zero rows affected is then disambiguated by
   * re-reading: no row → `not-found`, otherwise the row changed under the caller → `stale-write`.
   * A unique slug clash becomes a `slug-conflict` result.
   */
  private async writePost(
    id: string,
    changes: BlogPostColumnChanges,
    editedBy: string | null,
    options: { readonly expectedUpdatedAt: Date | null; readonly slug: string },
  ): Promise<BlogPostWriteResult> {
    const update = this.blogPostRepository
      .createQueryBuilder()
      .update(BlogPost)
      .set({ ...changes, lastEditedBy: editedBy })
      .where('id = :id', { id });
    if (options.expectedUpdatedAt != null) {
      update.andWhere(UPDATED_AT_MATCHES_EXPECTED_SQL, {
        expectedUpdatedAt: options.expectedUpdatedAt,
      });
    }

    try {
      const { affected } = await update.execute();
      if ((affected ?? 0) > 0) return await this.reloadPost(id);
    } catch (error) {
      if (isUniqueViolation(error)) return blogWriteSlugConflict(options.slug);
      throw error;
    }

    const current = await this.blogPostRepository.findOneBy({ id });
    return current == null
      ? blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id)
      : blogWriteStaleWrite(current.updatedAt);
  }

  /** Posts for `ids` with author and tags, in the order of `ids`. */
  private async hydratePosts(ids: readonly string[]): Promise<BlogPost[]> {
    const posts = await this.blogPostRepository.find({
      order: { tags: { name: 'ASC' } },
      relations: { author: true, tags: true },
      where: { id: In([...ids]) },
    });
    const postsById = new Map(posts.map((post) => [post.id, post]));
    return ids.flatMap((id) => postsById.get(id) ?? []);
  }

  private async reloadPost(id: string): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOne({
      order: { tags: { name: 'ASC' } },
      relations: { author: true, tags: true },
      where: { id },
    });
    return post == null
      ? blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id)
      : blogWriteOk(post);
  }
}
