import type { MetaDescriptor } from 'react-router';
import { describe, expect, test } from 'vitest';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import {
  MOCK_BLOG_POST_DETAIL,
  MOCK_BLOG_TAG,
} from '~/routing/blog/testing/mock.blog-posts';

import {
  buildBlogIndexMeta,
  buildBlogPostMeta,
  buildBlogTagMeta,
} from '../blog-seo';

const readField = (entry: MetaDescriptor, field: string): unknown =>
  Object.entries(entry).find(([key]) => key === field)?.[1];

const findContent = (
  meta: readonly MetaDescriptor[],
  key: 'name' | 'property',
  value: string,
): unknown =>
  readField(
    meta.find((entry) => readField(entry, key) === value) ?? {},
    'content',
  );

const findTitle = (meta: readonly MetaDescriptor[]): unknown =>
  meta.map((entry) => readField(entry, 'title')).find((v) => v !== undefined);

const findCanonical = (meta: readonly MetaDescriptor[]): unknown =>
  readField(
    meta.find((entry) => readField(entry, 'rel') === 'canonical') ?? {},
    'href',
  );

const findFeedLink = (meta: readonly MetaDescriptor[]): MetaDescriptor =>
  meta.find((entry) => readField(entry, 'type') === 'application/rss+xml') ??
  {};

describe('blog-seo', () => {
  describe('RSS alternate link', () => {
    test.each([
      ['index', buildBlogIndexMeta()],
      ['tag', buildBlogTagMeta(MOCK_BLOG_TAG)],
      ['post', buildBlogPostMeta(MOCK_BLOG_POST_DETAIL)],
    ])('is advertised on the %s route', (_name, meta) => {
      const link = findFeedLink(meta);

      expect(readField(link, 'tagName')).toBe('link');
      expect(readField(link, 'rel')).toBe('alternate');
      expect(readField(link, 'title')).toBe(BLOG_COPY.feed.linkTitle);
      expect(readField(link, 'href')).toEqual(
        expect.stringMatching(/\/blog\/rss\.xml$/),
      );
    });
  });

  describe('buildBlogIndexMeta', () => {
    const meta = buildBlogIndexMeta();

    test('sets title, description, canonical and Open Graph tags', () => {
      expect(findTitle(meta)).toBe('Blog | OpenThrottle | AI');
      expect(findContent(meta, 'name', 'description')).toEqual(
        expect.stringContaining('OpenThrottle'),
      );
      expect(findCanonical(meta)).toEqual(expect.stringMatching(/\/blog$/));
      expect(findContent(meta, 'property', 'og:title')).toBe(findTitle(meta));
      expect(findContent(meta, 'property', 'og:type')).toBe('website');
    });

    test('has no article timestamp and leaves og:image to the root', () => {
      expect(
        findContent(meta, 'property', 'article:published_time'),
      ).toBeUndefined();
      expect(findContent(meta, 'property', 'og:image')).toBeUndefined();
    });
  });

  describe('buildBlogPostMeta', () => {
    test('uses the excerpt when there is no seoDescription', () => {
      const meta = buildBlogPostMeta(MOCK_BLOG_POST_DETAIL);

      expect(findTitle(meta)).toBe('From plans to commits | OpenThrottle | AI');
      expect(findContent(meta, 'name', 'description')).toBe(
        'How plans become commits.',
      );
      expect(findContent(meta, 'property', 'og:description')).toBe(
        'How plans become commits.',
      );
      expect(findCanonical(meta)).toEqual(
        expect.stringMatching(/\/blog\/plans-to-commits$/),
      );
    });

    test('uses seoTitle verbatim and prefers seoDescription when present', () => {
      const meta = buildBlogPostMeta({
        ...MOCK_BLOG_POST_DETAIL,
        seoDescription: 'Search snippet',
        seoTitle: 'Search title',
      });

      expect(findTitle(meta)).toBe('Search title');
      expect(findContent(meta, 'name', 'description')).toBe('Search snippet');
    });

    test('emits article type, ISO published time and the cover image', () => {
      const meta = buildBlogPostMeta(MOCK_BLOG_POST_DETAIL);

      expect(findContent(meta, 'property', 'og:type')).toBe('article');
      expect(findContent(meta, 'property', 'article:published_time')).toBe(
        '2026-03-04T10:00:00.000Z',
      );
      expect(findContent(meta, 'property', 'og:image')).toBe(
        'https://example.test/cover.png',
      );
    });

    test('omits og:image and the published time when the post has neither', () => {
      const meta = buildBlogPostMeta({
        ...MOCK_BLOG_POST_DETAIL,
        coverImageUrl: null,
        excerpt: null,
        publishedAt: null,
      });

      expect(findContent(meta, 'property', 'og:image')).toBeUndefined();
      expect(
        findContent(meta, 'property', 'article:published_time'),
      ).toBeUndefined();
      expect(findContent(meta, 'name', 'description')).toEqual(
        expect.stringContaining('OpenThrottle'),
      );
    });
  });

  describe('buildBlogTagMeta', () => {
    test('uses the tag description and a tag canonical', () => {
      const meta = buildBlogTagMeta(MOCK_BLOG_TAG);

      expect(findTitle(meta)).toBe('Agents posts | OpenThrottle | AI');
      expect(findContent(meta, 'name', 'description')).toBe(
        'Writing about agents.',
      );
      expect(findCanonical(meta)).toEqual(
        expect.stringMatching(/\/blog\/tags\/agents$/),
      );
    });

    test('falls back to generated copy without a tag description', () => {
      const meta = buildBlogTagMeta({ ...MOCK_BLOG_TAG, description: null });

      expect(findContent(meta, 'name', 'description')).toBe(
        'OpenThrottle blog posts tagged Agents.',
      );
    });
  });
});
