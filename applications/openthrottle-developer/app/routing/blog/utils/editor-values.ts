import {
  BLOG_DRAFT_SLUG_PREFIX,
  BLOG_SLUG_PATTERN,
} from '~/routing/blog/config/defaults';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type {
  BlogEditorPost,
  BlogPostChanges,
  BlogPostEditorValues,
  BlogPostFieldErrors,
} from '~/routing/blog/types';

/**
 * @description Generates a slug for a brand-new draft that satisfies the
 * server's kebab-case rule: `untitled-<base36 time>-<base36 random>`. Two calls
 * in the same millisecond still differ in the random part, which is what lets
 * `/blog/new` retry after a slug conflict.
 */
export const generateBlogDraftSlug = (
  now: number,
  random: () => number,
): string => {
  const entropy = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');

  return `${BLOG_DRAFT_SLUG_PREFIX}-${now.toString(36)}-${entropy}`;
};

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
