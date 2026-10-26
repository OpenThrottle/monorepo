import type {
  BlogPostEditorPostFragment,
  BlogPostState,
  BlogReferenceEntity,
  GetBlogPostEditorQuery,
  UpdateBlogPostInput,
} from '~/__generated__/graphql';
import type { BLOG_POST_SAVE_INTENT } from '~/routing/blog/config/defaults';

/** The post as the `/blog/:postId` loader returns it. */
export type BlogEditorPost = BlogPostEditorPostFragment;

/** What the `/blog/:postId` loader returns. */
export interface BlogPostEditorLoaderData {
  readonly authors: GetBlogPostEditorQuery['blogAdminAuthors'];
  /** The caller holds `blog:write`, so may edit posts that are not drafts. */
  readonly canWrite: boolean;
  readonly post: BlogEditorPost;
  readonly tags: GetBlogPostEditorQuery['blogAdminTags'];
}

/**
 * Local edit state of the post editor. Every nullable server field is held as a
 * string, with `''` standing for "unset", so inputs stay controlled.
 */
export interface BlogPostEditorValues {
  readonly authorSlug: string;
  readonly bodyMarkdown: string;
  readonly coverImageAlt: string;
  readonly coverImageUrl: string;
  readonly excerpt: string;
  readonly seoDescription: string;
  readonly seoTitle: string;
  readonly slug: string;
  readonly tagSlugs: readonly string[];
  readonly title: string;
}

/** One editable field of {@link BlogPostEditorValues}. */
export type BlogPostEditorField = keyof BlogPostEditorValues;

/** The editor fields that hold a plain string (every field but the tag list). */
export type BlogPostTextFieldName = Exclude<BlogPostEditorField, 'tagSlugs'>;

/** Inline error message per field; a field with no entry is valid. */
export type BlogPostFieldErrors = Readonly<
  Partial<Record<BlogPostEditorField, string>>
>;

/** Sets one field of the editor's local state. */
export type BlogPostFieldChangeHandler = <TField extends BlogPostEditorField>(
  field: TField,
  value: BlogPostEditorValues[TField],
) => void;

/** One of {@link BLOG_POST_SAVE_INTENT}. */
export type BlogPostSaveIntent =
  (typeof BLOG_POST_SAVE_INTENT)[keyof typeof BLOG_POST_SAVE_INTENT];

/** The changed fields of an `updateBlogPost` call (no id, no stale check). */
export type BlogPostChanges = Omit<
  UpdateBlogPostInput,
  'expectedUpdatedAt' | 'id'
>;

/** JSON body the editor posts to the `/blog/:postId` action. */
export interface BlogPostSaveRequest {
  readonly changes: BlogPostChanges;
  readonly expectedUpdatedAt: string;
  readonly intent: BlogPostSaveIntent;
  /** The post's whole new tag set, or `null` when the tags did not change. */
  readonly tagSlugs: string[] | null;
}

/**
 * What a save did, one member per outcome the editor handles inline. Union
 * errors from the server are returned, never thrown.
 */
export type BlogPostSaveResult =
  | { readonly outcome: 'coverAltRequired'; readonly message: string }
  | { readonly outcome: 'error'; readonly message: string }
  | { readonly outcome: 'notFound'; readonly message: string }
  | { readonly outcome: 'publishPermissionRequired'; readonly message: string }
  | {
      readonly entity: BlogReferenceEntity;
      readonly key: string;
      readonly message: string;
      readonly outcome: 'referenceNotFound';
    }
  | { readonly outcome: 'saved' }
  | {
      readonly message: string;
      readonly outcome: 'slugConflict';
      readonly slug: string;
    }
  | {
      readonly currentUpdatedAt: string;
      readonly message: string;
      readonly outcome: 'staleWrite';
    }
  /** The fields were written but the tag set was not. */
  | { readonly message: string; readonly outcome: 'tagsNotSaved' };

/**
 * JSON body the editor posts to the `/blog/:postId` action to move a post
 * through its lifecycle. `publishedAt` is a UTC ISO timestamp, or `null` to
 * publish now; a future value schedules the post.
 */
export type BlogPostLifecycleRequest =
  | { readonly intent: 'archive' }
  | { readonly intent: 'publish'; readonly publishedAt: string | null }
  | { readonly intent: 'unpublish' };

/**
 * What a lifecycle action did. Union errors from the server are returned,
 * never thrown. `published` carries the new state so the toast can tell a
 * scheduled post from a live one.
 */
export type BlogPostLifecycleResult =
  | { readonly outcome: 'archived' }
  | { readonly message: string; readonly outcome: 'lifecycleError' }
  | { readonly message: string; readonly outcome: 'lifecycleNotFound' }
  | {
      readonly outcome: 'published';
      readonly publishedAt: string | null;
      readonly state: BlogPostState;
    }
  | { readonly outcome: 'unpublished' };

/**
 * One control the lifecycle bar can offer. `unpublish` and `moveToDraft` both
 * call `unpublishBlogPost`; they differ in the wording of the button and of the
 * confirmation. `publish` and `reschedule` both open the date popover.
 */
export type BlogPostLifecycleAction =
  'archive' | 'moveToDraft' | 'publish' | 'reschedule' | 'unpublish';

/** Everything the `/blog/:postId` action can return. */
export type BlogPostActionResult = BlogPostLifecycleResult | BlogPostSaveResult;

/** What creating a draft produced: the new post's id, or why there is none. */
export type BlogPostCreateResult =
  | { readonly error: string; readonly postId: null }
  | { readonly error: null; readonly postId: string };
