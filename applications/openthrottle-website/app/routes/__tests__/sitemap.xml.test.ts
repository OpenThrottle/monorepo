import { describe, expect, test, vi } from 'vitest';
import type { Route } from '@/app/routes/+types/sitemap[.]xml';

vi.mock('@openthrottle/react-router-utils', () => ({
  APP_URL: 'https://openthrottle.ai',
}));

vi.mock('~/routing/docs/data/docsManifest', () => ({
  docsManifest: [
    { draft: false, path: '/docs/getting-started' },
    { draft: false, path: '/faq' },
    { draft: true, path: '/docs/secret-draft' },
  ],
}));

const { loader } = await import('../sitemap[.]xml');

describe('routes/sitemap[.]xml.tsx', () => {
  test('emits an XML sitemap of absolute, non-draft, deduped URLs', async () => {
    const response = loader({} as Route.LoaderArgs);
    const body = await response.text();

    expect(response.headers.get('Content-Type')).toBe('application/xml');

    // Static page routes.
    expect(body).toContain('<loc>https://openthrottle.ai</loc>');
    expect(body).toContain('<loc>https://openthrottle.ai/docs</loc>');
    expect(body).toContain('<loc>https://openthrottle.ai/demos/layout</loc>');

    // Manifest-driven docs/FAQ entries.
    expect(body).toContain(
      '<loc>https://openthrottle.ai/docs/getting-started</loc>',
    );
    expect(body).toContain('<loc>https://openthrottle.ai/faq</loc>');

    // Drafts are excluded.
    expect(body).not.toContain('secret-draft');

    // `/faq` appears once even though it's both a static path and a manifest entry.
    expect(body.split('<loc>https://openthrottle.ai/faq</loc>')).toHaveLength(
      2,
    );
  });
});
