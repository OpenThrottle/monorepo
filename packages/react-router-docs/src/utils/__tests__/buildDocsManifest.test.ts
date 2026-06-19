import { describe, expect, test } from 'vitest';
import { buildDocsManifest } from '../buildDocsManifest';
import type { DocsContentModules } from '../buildDocsManifest';

const md = (frontmatter: string, body: string): string =>
  `---\n${frontmatter}\n---\n\n${body}\n`;

const MODULES: DocsContentModules = {
  './docs-content/docs/getting-started.md': md(
    'title: Getting Started\norder: 2',
    '# Getting Started',
  ),
  './docs-content/docs/guides/deploy.md': md(
    'title: Deploy\ngroup: Guides\norder: 1',
    '# Deploy',
  ),
  './docs-content/docs/index.md': md(
    'title: Overview\norder: 1',
    '# Overview\n\nWelcome.',
  ),
  './docs-content/docs/wip.md': md('title: WIP\ndraft: true', '# WIP'),
  './docs-content/faq/billing.md': md(
    'title: How does billing work?\ngroup: Billing',
    'Monthly.',
  ),
};

describe('buildDocsManifest', () => {
  test('derives section, route path and slug (incl. index -> section root + nesting)', () => {
    const entries = buildDocsManifest({ modules: MODULES });
    const byTitle = new Map(entries.map((e) => [e.title, e]));

    expect(byTitle.get('Overview')?.path).toBe('/docs');
    expect(byTitle.get('Overview')?.slug).toBe('');
    expect(byTitle.get('Getting Started')?.path).toBe('/docs/getting-started');
    expect(byTitle.get('Deploy')?.path).toBe('/docs/guides/deploy');
    expect(byTitle.get('How does billing work?')?.section).toBe('faq');
    expect(byTitle.get('How does billing work?')?.path).toBe('/faq/billing');
  });

  test('defaults group from subfolder/section and strips frontmatter from content', () => {
    const entries = buildDocsManifest({ modules: MODULES });
    const byTitle = new Map(entries.map((e) => [e.title, e]));

    expect(byTitle.get('Overview')?.group).toBe('General'); // directly under docs/
    expect(byTitle.get('Deploy')?.group).toBe('Guides'); // explicit frontmatter
    expect(byTitle.get('Overview')?.content).toBe('# Overview\n\nWelcome.');
  });

  test('excludes drafts by default, includes them when asked', () => {
    expect(
      buildDocsManifest({ modules: MODULES }).some((e) => e.title === 'WIP'),
    ).toBe(false);
    expect(
      buildDocsManifest({ includeDrafts: true, modules: MODULES }).some(
        (e) => e.title === 'WIP',
      ),
    ).toBe(true);
  });

  test('sorts within a group by order then title', () => {
    const general = buildDocsManifest({ modules: MODULES })
      .filter((e) => e.group === 'General')
      .map((e) => e.title);

    expect(general).toEqual(['Overview', 'Getting Started']); // order 1, then 2
  });

  test('throws on missing title', () => {
    expect(() =>
      buildDocsManifest({
        modules: { './docs-content/docs/bad.md': md('order: 1', 'no title') },
      }),
    ).toThrow(/missing a required string "title"/);
  });
});
