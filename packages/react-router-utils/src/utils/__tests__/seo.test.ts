import { describe, expect, test, vi } from 'vitest';

vi.mock('../../config/application', () => ({
  APP_URL: 'https://openthrottle.ai',
}));

const {
  buildCanonicalUrl,
  buildOrganizationJsonLd,
  buildRobotsTxt,
  buildSeoMeta,
  buildSitemapXml,
  buildWebsiteJsonLd,
  canonicalMeta,
  serializeJsonLd,
} = await import('../seo');

describe('buildCanonicalUrl', () => {
  test('returns the base URL for the root path', () => {
    expect(buildCanonicalUrl('/')).toBe('https://openthrottle.ai');
  });

  test('builds a per-route absolute URL', () => {
    expect(buildCanonicalUrl('/docs')).toBe('https://openthrottle.ai/docs');
    expect(buildCanonicalUrl('/docs/getting-started')).toBe(
      'https://openthrottle.ai/docs/getting-started',
    );
  });

  test('normalizes trailing slashes so variants share one canonical', () => {
    expect(buildCanonicalUrl('/docs/')).toBe('https://openthrottle.ai/docs');
  });
});

describe('canonicalMeta', () => {
  test('returns a canonical link meta descriptor for the pathname', () => {
    expect(canonicalMeta('/faq')).toStrictEqual({
      href: 'https://openthrottle.ai/faq',
      rel: 'canonical',
      tagName: 'link',
    });
  });
});

describe('buildSeoMeta', () => {
  test('emits title, description, og:* and twitter:* with defaults', () => {
    const meta = buildSeoMeta({ description: 'Desc', title: 'Hello' });

    expect(meta).toContainEqual({ title: 'Hello' });
    expect(meta).toContainEqual({ content: 'Desc', name: 'description' });
    expect(meta).toContainEqual({ content: 'Hello', property: 'og:title' });
    expect(meta).toContainEqual({ content: 'website', property: 'og:type' });
    expect(meta).toContainEqual({
      content: 'https://openthrottle.ai',
      property: 'og:url',
    });
    expect(meta).toContainEqual({
      content: 'summary_large_image',
      name: 'twitter:card',
    });
  });

  test('includes image tags only when an image is provided', () => {
    const withImage = buildSeoMeta({
      description: 'D',
      image: 'https://openthrottle.ai/og.png',
      title: 'T',
    });
    expect(withImage).toContainEqual({
      content: 'https://openthrottle.ai/og.png',
      property: 'og:image',
    });

    const withoutImage = buildSeoMeta({ description: 'D', title: 'T' });
    expect(
      withoutImage.some((m) => 'property' in m && m.property === 'og:image'),
    ).toBe(false);
  });
});

describe('JSON-LD builders', () => {
  test('organization drops undefined optional keys after serialization', () => {
    const org = buildOrganizationJsonLd({
      name: 'OpenThrottle',
      url: 'https://openthrottle.ai',
    });
    const parsed = JSON.parse(serializeJsonLd([org]))[0];

    expect(parsed).toStrictEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'OpenThrottle',
      url: 'https://openthrottle.ai',
    });
  });

  test('website includes description when provided', () => {
    const site = buildWebsiteJsonLd({
      description: 'Desc',
      name: 'OpenThrottle',
      url: 'https://openthrottle.ai',
    });
    expect(site['@type']).toBe('WebSite');
    expect(site.description).toBe('Desc');
  });
});

describe('buildSitemapXml', () => {
  test('dedupes, sorts, and renders absolute canonical URLs', () => {
    const xml = buildSitemapXml(['/docs', '/', '/docs', '/faq']);

    expect(xml).toContain('<loc>https://openthrottle.ai</loc>');
    expect(xml).toContain('<loc>https://openthrottle.ai/docs</loc>');
    expect(xml.match(/<loc>/g)).toHaveLength(3);
    expect(xml.indexOf('/docs')).toBeLessThan(xml.indexOf('/faq'));
  });
});

describe('buildRobotsTxt', () => {
  test('disallowAll yields a noindex policy', () => {
    expect(buildRobotsTxt({ disallowAll: true })).toBe(
      'User-agent: *\nDisallow: /\n',
    );
  });

  test('advertises the sitemap as an absolute URL when public', () => {
    expect(buildRobotsTxt({ sitemapPath: '/sitemap.xml' })).toBe(
      'User-agent: *\nAllow: /\nSitemap: https://openthrottle.ai/sitemap.xml\n',
    );
  });
});
