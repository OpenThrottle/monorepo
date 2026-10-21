import { describe, expect, test } from 'vitest';

import type { BlogFeedPost } from '../blog-rss';
import { buildBlogRssXml, escapeXml } from '../blog-rss';

const POST: BlogFeedPost = {
  author: { displayName: 'Ada Lovelace' },
  excerpt: 'How plans become commits.',
  publishedAt: '2026-03-04T10:00:00.000Z',
  seoDescription: null,
  slug: 'plans-to-commits',
  tags: [{ name: 'Agents' }, { name: 'Git' }],
  title: 'From plans to commits',
  updatedAt: '2026-03-06T10:00:00.000Z',
};

const parse = (xml: string): Document =>
  new DOMParser().parseFromString(xml, 'application/xml');

const text = (parent: Element | null, selector: string): string | undefined =>
  parent?.querySelector(selector)?.textContent ?? undefined;

describe('blog-rss', () => {
  describe('escapeXml', () => {
    test('escapes & < > " and the apostrophe', () => {
      expect(escapeXml(`Tom & "Jerry" <b>'s</b>`)).toBe(
        'Tom &amp; &quot;Jerry&quot; &lt;b&gt;&apos;s&lt;/b&gt;',
      );
    });

    test('escapes the ampersand first so entities are not double-encoded', () => {
      expect(escapeXml('a &amp; b')).toBe('a &amp;amp; b');
    });

    test('leaves safe text untouched', () => {
      expect(escapeXml('Plain text 123')).toBe('Plain text 123');
    });
  });

  describe('buildBlogRssXml', () => {
    test('emits a well-formed RSS 2.0 channel with a self link', () => {
      const document = parse(buildBlogRssXml([POST]));
      const rss = document.documentElement;
      const channel = rss.querySelector('channel');

      expect(document.querySelector('parsererror')).toBeNull();
      expect(rss.tagName).toBe('rss');
      expect(rss.getAttribute('version')).toBe('2.0');
      expect(rss.getAttribute('xmlns:atom')).toBe(
        'http://www.w3.org/2005/Atom',
      );
      expect(channel).not.toBeNull();
      expect(text(rss, 'channel > title')).toBe('OpenThrottle Blog');
      expect(text(rss, 'channel > link')).toMatch(/\/blog$/);
      expect(text(rss, 'channel > language')).toBe('en-us');
      expect(text(rss, 'channel > lastBuildDate')).toBe(
        'Fri, 06 Mar 2026 10:00:00 GMT',
      );

      const self = rss.getElementsByTagName('atom:link')[0];

      expect(self?.getAttribute('rel')).toBe('self');
      expect(self?.getAttribute('type')).toBe('application/rss+xml');
      expect(self?.getAttribute('href')).toMatch(/\/blog\/rss\.xml$/);
    });

    test('maps a post to an item with permalink guid, RFC-822 date and categories', () => {
      const item = parse(buildBlogRssXml([POST])).querySelector('item');

      expect(item).not.toBeNull();
      expect(text(item, 'title')).toBe('From plans to commits');
      expect(text(item, 'link')).toMatch(/\/blog\/plans-to-commits$/);

      const guid = item?.querySelector('guid');

      expect(guid?.getAttribute('isPermaLink')).toBe('true');
      expect(guid?.textContent).toBe(text(item, 'link'));
      expect(text(item, 'pubDate')).toBe('Wed, 04 Mar 2026 10:00:00 GMT');
      expect(text(item, 'description')).toBe('How plans become commits.');
      expect(
        [...(item?.querySelectorAll('category') ?? [])].map(
          (category) => category.textContent,
        ),
      ).toEqual(['Agents', 'Git']);
      expect(item?.getElementsByTagName('dc:creator')[0]?.textContent).toBe(
        'Ada Lovelace',
      );
      expect(item?.querySelector('author')).toBeNull();
    });

    test('accepts Date objects, which is how executeGraphql returns DateTime fields', () => {
      const item = parse(
        buildBlogRssXml([
          {
            ...POST,
            publishedAt: new Date('2026-03-04T10:00:00.000Z'),
            updatedAt: new Date('2026-03-06T10:00:00.000Z'),
          },
        ]),
      ).querySelector('item');

      expect(text(item, 'pubDate')).toBe('Wed, 04 Mar 2026 10:00:00 GMT');
    });

    test('prefers seoDescription and omits optional fields that are absent', () => {
      const item = parse(
        buildBlogRssXml([
          {
            ...POST,
            author: null,
            publishedAt: null,
            seoDescription: 'Search snippet',
            tags: [],
          },
        ]),
      ).querySelector('item');

      expect(text(item, 'description')).toBe('Search snippet');
      expect(item?.querySelector('pubDate')).toBeNull();
      expect(item?.querySelector('category')).toBeNull();
      expect(item?.getElementsByTagName('dc:creator')).toHaveLength(0);
    });

    test('escapes markup in titles, descriptions and tags and stays well-formed', () => {
      const xml = buildBlogRssXml([
        {
          ...POST,
          excerpt: `5 < 6 & "quotes" <script>alert('x')</script>`,
          tags: [{ name: 'R&D' }],
          title: `Plans & <Tasks> "in" 'flight'`,
        },
      ]);
      const item = parse(xml).querySelector('item');

      expect(xml).not.toContain('<script>');
      expect(parse(xml).querySelector('parsererror')).toBeNull();
      expect(text(item, 'title')).toBe(`Plans & <Tasks> "in" 'flight'`);
      expect(text(item, 'description')).toBe(
        `5 < 6 & "quotes" <script>alert('x')</script>`,
      );
      expect(text(item, 'category')).toBe('R&D');
    });

    test('emits an empty but valid channel (no lastBuildDate) for no posts', () => {
      const document = parse(buildBlogRssXml([]));

      expect(document.querySelector('parsererror')).toBeNull();
      expect(document.querySelectorAll('item')).toHaveLength(0);
      expect(document.querySelector('lastBuildDate')).toBeNull();
    });
  });
});
