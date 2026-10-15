import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Repository } from 'typeorm';

import { resolveListPagination } from '../../utils/list-pagination.ts';
import { isUniqueViolation } from '../../utils/unique-violation.ts';
import { BlogAuthor } from '../blog-authors/blog-author.entity.ts';
import { BlogTag } from '../blog-tags/blog-tag.entity.ts';
import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import { BlogPost } from './blog-post.entity.ts';
import {
  decodeBlogPostCursor,
  encodeBlogPostCursor,
} from './blog-post-cursor.ts';
import { applyBlogPostVisibility } from './blog-post-visibility.ts';
import type {
  BlogPostWriteResult,
  BlogWriteNotFound,
  BlogWriteOk,
} from './blog-write-result.ts';
import {
  BLOG_WRITE_ENTITY,
  BLOG_WRITE_RESULT_KIND,
  blogWriteNotFound,
  blogWriteOk,
  blogWriteSlugConflict,
} from './blog-write-result.ts';
import { assertBlogSlug, assertNotBlank } from './blog-write-validation.ts';

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

interface BlogPostKeyRow {
  readonly cursorPublishedAt: string;
  readonly id: string;
}

/** `published_at` at full microsecond precision, as ISO-8601 UTC text. */
const CURSOR_PUBLISHED_AT_SQL = `to_char(post.publishedAt AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

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

    const posts = await this.blogPostRepository.find({
      order: { tags: { name: 'ASC' } },
      relations: { author: true, tags: true },
      where: { id: In(pageRows.map((row) => row.id)) },
    });
    const postsById = new Map(posts.map((post) => [post.id, post]));

    return {
      endCursor: encodeBlogPostCursor({
        id: lastRow.id,
        publishedAt: lastRow.cursorPublishedAt,
      }),
      hasNextPage: rows.length > take,
      items: pageRows.flatMap((row) => postsById.get(row.id) ?? []),
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
   * @description Creates a DRAFT post. Admin write path: the public visibility rule is not
   * applied. The slug is validated against the DB CHECK shape first, so a malformed slug is a
   * `BadRequestException` rather than a constraint violation; a slug another post already uses
   * (unique index `idx_blog_posts_slug`, including a race with a concurrent insert) comes back
   * as a `slug-conflict` result, never a thrown 23505.
   * @throws BadRequestException on a malformed slug or blank title.
   * @public
   */
  async createPost(input: BlogPostDraftInput): Promise<BlogPostWriteResult> {
    assertBlogSlug(input.slug);
    assertNotBlank(input.title, 'title');

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
   * @throws BadRequestException on a malformed slug or blank title.
   * @public
   */
  async updatePost(
    id: string,
    patch: BlogPostPatch,
  ): Promise<BlogPostWriteResult> {
    if (patch.slug !== undefined) assertBlogSlug(patch.slug);
    if (patch.title !== undefined) assertNotBlank(patch.title, 'title');

    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    if (patch.authorSlug !== undefined) {
      const author = await this.resolveAuthorId(patch.authorSlug);
      if (author.kind !== BLOG_WRITE_RESULT_KIND.OK) return author;
      post.authorId = author.value;
    }
    if (patch.bodyMarkdown !== undefined) {
      post.bodyMarkdown = patch.bodyMarkdown;
    }
    if (patch.coverImageAlt !== undefined) {
      post.coverImageAlt = patch.coverImageAlt;
    }
    if (patch.coverImageUrl !== undefined) {
      post.coverImageUrl = patch.coverImageUrl;
    }
    if (patch.excerpt !== undefined) post.excerpt = patch.excerpt;
    if (patch.seoDescription !== undefined) {
      post.seoDescription = patch.seoDescription;
    }
    if (patch.seoTitle !== undefined) post.seoTitle = patch.seoTitle;
    if (patch.slug !== undefined) post.slug = patch.slug;
    if (patch.title !== undefined) post.title = patch.title;

    return this.saveAndReload(post, patch.slug ?? post.slug);
  }

  /**
   * @description Publishes a post: status becomes PUBLISHED and `published_at` is set. With no
   * `publishedAt` the post goes live now (a post that is already PUBLISHED keeps its original
   * date, so re-publishing never bumps it to the top of the feed; a post that is merely
   * scheduled goes live now instead); a future `publishedAt`
   * SCHEDULES it — status is PUBLISHED but the public visibility rule hides it until the
   * database clock reaches that date.
   * @public
   */
  async publishPost(
    id: string,
    publishedAt?: Date | null,
  ): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    const now = new Date();
    const alreadyLive =
      post.status === BLOG_POST_STATUS.PUBLISHED &&
      post.publishedAt != null &&
      post.publishedAt <= now;
    post.publishedAt = publishedAt ?? (alreadyLive ? post.publishedAt : now);
    post.status = BLOG_POST_STATUS.PUBLISHED;

    return this.saveAndReload(post, post.slug);
  }

  /**
   * @description Takes a post back to DRAFT and clears `published_at` (a later publish
   * stamps a fresh date). The post stops being publicly visible immediately.
   * @public
   */
  async unpublishPost(id: string): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    post.status = BLOG_POST_STATUS.DRAFT;
    post.publishedAt = null;

    return this.saveAndReload(post, post.slug);
  }

  /**
   * @description Archives a post. `published_at` is retained as history; the post is no
   * longer publicly visible.
   * @public
   */
  async archivePost(id: string): Promise<BlogPostWriteResult> {
    const post = await this.blogPostRepository.findOneBy({ id });
    if (post == null) return blogWriteNotFound(BLOG_WRITE_ENTITY.POST, id);

    post.status = BLOG_POST_STATUS.ARCHIVED;

    return this.saveAndReload(post, post.slug);
  }

  /**
   * @description Replaces the full set of tags on a post. `tagSlugs` are de-duplicated; an
   * empty list removes every tag. Returns `not-found` (entity `tag`, key = the slug) for the
   * first slug that has no tag, leaving the post untouched.
   * @throws BadRequestException when any slug is malformed.
   * @public
   */
  async setPostTags(
    postId: string,
    tagSlugs: readonly string[],
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
    return this.saveAndReload(post, post.slug);
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

  /** Saves `post` and returns it reloaded with author and tags; unique slug clash → result. */
  private async saveAndReload(
    post: BlogPost,
    slug: string,
  ): Promise<BlogPostWriteResult> {
    try {
      await this.blogPostRepository.save(post);
      return await this.reloadPost(post.id);
    } catch (error) {
      if (isUniqueViolation(error)) return blogWriteSlugConflict(slug);
      throw error;
    }
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
