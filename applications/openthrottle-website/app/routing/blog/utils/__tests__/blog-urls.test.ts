import { describe, expect, test } from 'vitest';

import {
  BLOG_FEED_PATH,
  buildBlogPageHref,
  buildBlogPostPath,
  buildBlogTagPath,
} from '../blog-urls';

describe('blog-urls', () => {
  test('buildBlogPostPath and buildBlogTagPath build encoded paths', () => {
    expect(buildBlogPostPath('hello-world')).toBe('/blog/hello-world');
    expect(buildBlogTagPath('a b')).toBe('/blog/tags/a%20b');
  });

  test('BLOG_FEED_PATH is the static /blog/rss.xml path', () => {
    expect(BLOG_FEED_PATH).toBe('/blog/rss.xml');
  });

  describe('buildBlogPageHref', () => {
    test('returns the bare base path without a cursor', () => {
      expect(buildBlogPageHref({ after: null, basePath: '/blog' })).toBe(
        '/blog',
      );
    });

    test('appends an encoded after cursor', () => {
      expect(buildBlogPageHref({ after: 'a=b', basePath: '/blog' })).toBe(
        '/blog?after=a%3Db',
      );
    });
  });
});
