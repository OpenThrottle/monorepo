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

  test('throws on a duplicate route path (frontmatter slug shadows index root)', () => {
    expect(() =>
      buildDocsManifest({
        modules: {
          // A second file pinned to the same slug as another page collides.
          './docs-content/docs/alias.md': md(
            'title: Alias\nslug: getting-started',
            '# Alias',
          ),

          './docs-content/docs/getting-started.md': md(
            'title: Getting Started',
            '# Getting Started',
          ),
        },
      }),
    ).toThrow(/duplicate route path "\/docs\/getting-started"/);
  });

  test('throws on two faq entries sharing a slug', () => {
    expect(() =>
      buildDocsManifest({
        modules: {
          './docs-content/faq/a.md': md('title: First\nslug: billing', 'A.'),
          './docs-content/faq/b.md': md('title: Second\nslug: billing', 'B.'),
        },
      }),
    ).toThrow(/duplicate route path "\/faq\/billing"/);
  });

  test('throws when a content file is not under a docs/ or faq/ section', () => {
    expect(() =>
      buildDocsManifest({
        modules: {
          './docs-content/blog/post.md': md('title: A Post', '# Post'),
        },
      }),
    ).toThrow(/is not under a "docs\/" or "faq\/" section/);
  });

  test('treats a non-string frontmatter title as a missing title (number)', () => {
    expect(() =>
      buildDocsManifest({
        modules: {
          './docs-content/docs/numeric.md': md('title: 42', '# Body'),
        },
      }),
    ).toThrow(/missing a required string "title"/);
  });

  test('treats a non-object YAML frontmatter root as empty data, so title throws', () => {
    // A scalar root (just a string) parses to a non-object, hitting the
    // `{ ...parsed }` guard in parseFrontmatter and yielding empty data — so the
    // missing-title throw fires rather than a crash.
    expect(() =>
      buildDocsManifest({
        modules: {
          './docs-content/docs/scalar.md':
            '---\njust a scalar\n---\n\n# Body\n',
        },
      }),
    ).toThrow(/missing a required string "title"/);
  });

  test('treats a YAML list frontmatter root as having no title, so title throws', () => {
    // An array spreads to index-keyed data ({ 0: 'one', ... }) with no `title`,
    // so the missing-title throw fires.
    expect(() =>
      buildDocsManifest({
        modules: {
          './docs-content/docs/list.md': '---\n- one\n- two\n---\n\n# Body\n',
        },
      }),
    ).toThrow(/missing a required string "title"/);
  });

  test('keeps draft FAQ entries out by default, in when includeDrafts is set', () => {
    const modules: DocsContentModules = {
      './docs-content/faq/published.md': md(
        'title: Published FAQ\ngroup: Billing',
        'Answer.',
      ),
      './docs-content/faq/wip.md': md(
        'title: Draft FAQ\ngroup: Billing\ndraft: true',
        'Hidden.',
      ),
    };

    expect(
      buildDocsManifest({ modules }).some((e) => e.title === 'Draft FAQ'),
    ).toBe(false);
    expect(
      buildDocsManifest({ includeDrafts: true, modules }).some(
        (e) => e.title === 'Draft FAQ',
      ),
    ).toBe(true);
  });
});
