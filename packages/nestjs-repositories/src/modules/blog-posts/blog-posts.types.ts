import type { BlogPost } from './blog-post.entity.ts';
import type { BLOG_POST_STATUS } from './blog-posts.constants.ts';
import type { BlogPostState } from './visibility/visibility.types.ts';

/** @public */
export type BlogPostStatus =
  (typeof BLOG_POST_STATUS)[keyof typeof BLOG_POST_STATUS];
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
