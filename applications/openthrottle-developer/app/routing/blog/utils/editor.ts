import { z } from 'zod/v3';

import type {
  SetBlogPostEditorTagsMutation,
  UpdateBlogPostEditorMutation,
} from '~/__generated__/graphql';
import { BlogReferenceEntity } from '~/__generated__/graphql';
import { UpdateBlogPostInputSchema } from '~/__generated__/schemas';
import {
  BLOG_POST_EDITOR_FIELDS,
  BLOG_POST_SAVE_INTENT,
  BLOG_SLUG_PATTERN,
} from '~/routing/blog/config/defaults';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type {
  BlogEditorPost,
  BlogPostChanges,
  BlogPostEditorValues,
  BlogPostFieldErrors,
  BlogPostSaveRequest,
  BlogPostSaveResult,
} from '~/routing/blog/types';

const SAVE_REQUEST_SCHEMA = z.object({
  changes: UpdateBlogPostInputSchema()
    .omit({ expectedUpdatedAt: true, id: true })
    .strict(),
  expectedUpdatedAt: z.string().min(1),
  intent: z.enum([BLOG_POST_SAVE_INTENT.OVERWRITE, BLOG_POST_SAVE_INTENT.SAVE]),
  tagSlugs: z.array(z.string()).nullable(),
});

/**
 * @description The editor's local state for `post`: every nullable field as a
 * string (`''` for unset) and the tag list as slugs.
 */
export const toBlogPostEditorValues = (
  post: BlogEditorPost,
): BlogPostEditorValues => ({
  authorSlug: post.author?.slug ?? '',
  bodyMarkdown: post.bodyMarkdown,
  coverImageAlt: post.coverImageAlt ?? '',
  coverImageUrl: post.coverImageUrl ?? '',
  excerpt: post.excerpt ?? '',
  seoDescription: post.seoDescription ?? '',
  seoTitle: post.seoTitle ?? '',
  slug: post.slug,
  tagSlugs: post.tags.map((tag) => tag.slug),
  title: post.title,
});

/** @description True when both lists hold the same slugs, in any order. */
export const isSameTagSet = (
  left: readonly string[],
  right: readonly string[],
): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  const set = new Set(left);

  return right.every((slug) => set.has(slug));
};

/** `''` clears a nullable field on the server, which expects `null`. */
const toNullable = (value: string): string | null =>
  value === '' ? null : value;

/**
 * @description What a save must send: only the fields that differ from the
 * loaded `post` (nullable ones as `null` when emptied), plus the whole tag set
 * when it changed, or `null` when it did not.
 */
export const diffBlogPostEditorValues = (
  post: BlogEditorPost,
  values: BlogPostEditorValues,
): {
  readonly changes: BlogPostChanges;
  readonly tagSlugs: string[] | null;
} => {
  const base = toBlogPostEditorValues(post);
  const changed = (field: keyof BlogPostChanges): boolean =>
    base[field] !== values[field];

  const changes: BlogPostChanges = {
    ...(changed('authorSlug') && { authorSlug: toNullable(values.authorSlug) }),
    ...(changed('bodyMarkdown') && { bodyMarkdown: values.bodyMarkdown }),
    ...(changed('coverImageAlt') && {
      coverImageAlt: toNullable(values.coverImageAlt),
    }),
    ...(changed('coverImageUrl') && {
      coverImageUrl: toNullable(values.coverImageUrl),
    }),
    ...(changed('excerpt') && { excerpt: toNullable(values.excerpt) }),
    ...(changed('seoDescription') && {
      seoDescription: toNullable(values.seoDescription),
    }),
    ...(changed('seoTitle') && { seoTitle: toNullable(values.seoTitle) }),
    ...(changed('slug') && { slug: values.slug }),
    ...(changed('title') && { title: values.title }),
  };

  return {
    changes,
    tagSlugs: isSameTagSet(base.tagSlugs, values.tagSlugs)
      ? null
      : [...values.tagSlugs],
  };
};

/** @description True when `values` differ from the loaded `post` at all. */
export const isBlogPostEditorDirty = (
  post: BlogEditorPost,
  values: BlogPostEditorValues,
): boolean => {
  const { changes, tagSlugs } = diffBlogPostEditorValues(post, values);

  return tagSlugs !== null || Object.keys(changes).length > 0;
};

/**
 * @description Client-side checks that mirror the server's write rules, so the
 * author sees the problem before saving: a non-blank title, a kebab-case slug,
 * and alt text whenever a cover image URL is set.
 */
export const validateBlogPostEditorValues = (
  values: BlogPostEditorValues,
): BlogPostFieldErrors => {
  const hasCover = values.coverImageUrl.trim() !== '';

  return {
    ...(values.title.trim() === '' && {
      title: BLOG_EDITOR_COPY.titleRequired,
    }),
    ...(!BLOG_SLUG_PATTERN.test(values.slug) && {
      slug: BLOG_EDITOR_COPY.slugInvalid,
    }),
    ...(hasCover &&
      values.coverImageAlt.trim() === '' && {
        coverImageAlt: BLOG_EDITOR_COPY.coverAltRequired,
      }),
  };
};

/**
 * @description Validates the editor's JSON save body. `null` for anything that
 * is not a well-formed {@link BlogPostSaveRequest}.
 */
export const parseBlogPostSaveRequest = (
  body: unknown,
): BlogPostSaveRequest | null => {
  const parsed = SAVE_REQUEST_SCHEMA.safeParse(body);

  return parsed.success ? parsed.data : null;
};

/**
 * @description Maps the `updateBlogPost` union onto the editor's
 * {@link BlogPostSaveResult}. A written post is `saved`.
 */
export const toBlogPostUpdateResult = (
  result: UpdateBlogPostEditorMutation['updateBlogPost'],
): BlogPostSaveResult => {
  switch (result.__typename) {
    case 'BlogCoverAltRequiredError':
      return { message: result.message, outcome: 'coverAltRequired' };
    case 'BlogPostAdminObject':
      return { outcome: 'saved' };
    case 'BlogPostNotFoundError':
      return { message: result.message, outcome: 'notFound' };
    case 'BlogPostPublishPermissionRequiredError':
      return { message: result.message, outcome: 'publishPermissionRequired' };
    case 'BlogPostStaleWriteError':
      return {
        currentUpdatedAt: String(result.currentUpdatedAt),
        message: result.message,
        outcome: 'staleWrite',
      };
    case 'BlogReferenceNotFoundError':
      return {
        entity: result.entity,
        key: result.key,
        message: result.message,
        outcome: 'referenceNotFound',
      };
    case 'BlogSlugConflictError':
      return {
        message: result.message,
        outcome: 'slugConflict',
        slug: result.slug,
      };
  }
};

/**
 * @description Maps the `setBlogPostTags` union, which runs only after the
 * fields were written: anything but a post is `tagsNotSaved`, except a lost
 * publish permission, which the editor shows as its read-only notice.
 */
export const toBlogPostTagsResult = (
  result: SetBlogPostEditorTagsMutation['setBlogPostTags'],
): BlogPostSaveResult => {
  switch (result.__typename) {
    case 'BlogPostAdminObject':
      return { outcome: 'saved' };
    case 'BlogPostPublishPermissionRequiredError':
      return { message: result.message, outcome: 'publishPermissionRequired' };
    case 'BlogPostNotFoundError':
    case 'BlogReferenceNotFoundError':
      return { message: result.message, outcome: 'tagsNotSaved' };
  }
};

/** @description Narrows an unknown action result to a {@link BlogPostSaveResult}. */
export const isBlogPostSaveResult = (
  value: unknown,
): value is BlogPostSaveResult =>
  typeof value === 'object' &&
  value !== null &&
  'outcome' in value &&
  typeof value.outcome === 'string';

/**
 * @description True when the save wrote the post, so the loader must re-read
 * it (new `updatedAt`, new `lastEditedBy`). Failed saves wrote nothing; keeping
 * the loaded post is what lets a stale write stay detectable.
 */
export const didBlogPostSaveWrite = (value: unknown): boolean =>
  isBlogPostSaveResult(value) &&
  (value.outcome === 'saved' || value.outcome === 'tagsNotSaved');

/**
 * @description The inline field error a save outcome maps to, if any: a taken
 * slug, a missing cover alt, an unknown author or tag.
 */
export const toBlogPostSaveFieldErrors = (
  result: BlogPostSaveResult | null,
): BlogPostFieldErrors => {
  switch (result?.outcome) {
    case 'coverAltRequired':
      return { coverImageAlt: BLOG_EDITOR_COPY.coverAltRequired };
    case 'referenceNotFound':
      return result.entity === BlogReferenceEntity.Author
        ? { authorSlug: result.message }
        : { tagSlugs: result.message };
    case 'slugConflict':
      return { slug: BLOG_EDITOR_COPY.slugTaken(result.slug) };
    case 'tagsNotSaved':
      return { tagSlugs: result.message };
    default:
      return {};
  }
};

/**
 * @description Keeps only the server field errors whose field still holds the
 * value that was submitted, so an error clears as soon as the author edits it.
 */
export const filterStaleFieldErrors = (
  errors: BlogPostFieldErrors,
  submitted: BlogPostEditorValues | null,
  current: BlogPostEditorValues,
): BlogPostFieldErrors => {
  if (submitted === null) {
    return {};
  }

  return Object.fromEntries(
    BLOG_POST_EDITOR_FIELDS.flatMap((field) => {
      const error = errors[field];
      const unchanged =
        JSON.stringify(submitted[field]) === JSON.stringify(current[field]);

      return error !== undefined && unchanged ? [[field, error]] : [];
    }),
  );
};
