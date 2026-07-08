import { describe, expect, test, vi } from 'vitest';
import type { Route } from '@/app/routes/+types/sitemap[.]xml';

// The URL/dedup/absolute-canonical behavior now lives in (and is tested with)
// buildSitemapResponse in @openthrottle/react-router-utils. Here we verify the
// route's own responsibility: assembling static + non-draft manifest paths and
// delegating to the shared helper.
const buildSitemapResponse = vi.fn(
  (_paths: readonly string[]) =>
    new Response('<urlset />', {
      headers: { 'Content-Type': 'application/xml' },
    }),
);

vi.mock('@openthrottle/react-router-utils', () => ({ buildSitemapResponse }));

vi.mock('~/routing/docs/data/docsManifest', () => ({
  docsManifest: [
    { draft: false, path: '/docs/getting-started' },
    { draft: false, path: '/faq' },
    { draft: true, path: '/docs/secret-draft' },
  ],
}));

const { loader } = await import('../sitemap[.]xml');

describe('routes/sitemap[.]xml.tsx', () => {
  test('delegates static + non-draft manifest paths to the shared helper', () => {
    const response = loader({} as Route.LoaderArgs);

    expect(response.headers.get('Content-Type')).toBe('application/xml');
    expect(buildSitemapResponse).toHaveBeenCalledTimes(1);

    const paths = buildSitemapResponse.mock.calls[0]?.[0];

    // Static page routes.
    expect(paths).toContain('/');
    expect(paths).toContain('/docs');
    expect(paths).toContain('/demos/layout');

    // Manifest-driven, non-draft entries.
    expect(paths).toContain('/docs/getting-started');
    expect(paths).toContain('/faq');

    // Drafts are excluded by the route before delegating.
    expect(paths).not.toContain('/docs/secret-draft');
  });
});
