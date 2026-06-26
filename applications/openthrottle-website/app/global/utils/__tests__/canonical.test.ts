import { describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-utils', () => ({
  APP_URL: 'https://openthrottle.ai',
}));

const { buildCanonicalUrl, canonicalMeta } = await import('../canonical');

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
