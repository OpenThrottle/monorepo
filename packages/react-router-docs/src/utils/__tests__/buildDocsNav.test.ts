import { describe, expect, test } from 'vitest';
import { buildDocsManifest } from '../buildDocsManifest';
import type { DocsContentModules } from '../buildDocsManifest';
import { buildDocsNav } from '../buildDocsNav';

const md = (frontmatter: string, body: string): string =>
  `---\n${frontmatter}\n---\n\n${body}\n`;

const MODULES: DocsContentModules = {
  './docs-content/docs/getting-started.md': md(
    'title: Getting Started\norder: 2',
    'b',
  ),
  './docs-content/docs/guides/deploy.md': md(
    'title: Deploy\ngroup: Guides\norder: 1',
    'b',
  ),
  './docs-content/docs/index.md': md('title: Overview\norder: 1', 'b'),
  './docs-content/faq/billing.md': md('title: Billing?\ngroup: Billing', 'b'),
};

describe('buildDocsNav', () => {
  test('groups a section, orders items per-group, groups alphabetically', () => {
    const nav = buildDocsNav(buildDocsManifest({ modules: MODULES }), 'docs');

    expect(nav.map((g) => g.label)).toEqual(['General', 'Guides']); // alphabetical
    expect(nav[0].items.map((i) => i.title)).toEqual([
      'Overview', // order 1
      'Getting Started', // order 2
    ]);
    expect(nav[1].items).toEqual([
      { path: '/docs/guides/deploy', title: 'Deploy' },
    ]);
  });

  test('excludes other sections', () => {
    const nav = buildDocsNav(buildDocsManifest({ modules: MODULES }), 'docs');
    expect(
      nav.flatMap((g) => g.items).some((i) => i.path.startsWith('/faq')),
    ).toBe(false);
  });
});
