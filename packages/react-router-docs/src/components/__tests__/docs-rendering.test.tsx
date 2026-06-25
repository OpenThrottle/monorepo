import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildDocsManifest } from '../../utils/buildDocsManifest';
import type { DocsContentModules } from '../../utils/buildDocsManifest';
import { buildDocsNav } from '../../utils/buildDocsNav';
import { DocPageView } from '../DocPageView';
import { DocsNav } from '../DocsNav';
import { FaqView } from '../FaqView';

// The APP owns the glob; here the package's own test plays that role against the
// reference fixture (proving the full glob -> manifest -> render pipeline).
const modules: DocsContentModules = import.meta.glob<string>(
  '../../../tests/fixtures/docs-content/**/*.md',
  { eager: true, import: 'default', query: '?raw' },
);

const manifest = buildDocsManifest({ modules });
const faqEntries = manifest.filter((entry) => entry.section === 'faq');

const md = (frontmatter: string, body: string): string =>
  `---\n${frontmatter}\n---\n\n${body}\n`;

describe('docs rendering pipeline (fixture)', () => {
  test('the fixture loads into a manifest', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(5);
    expect(manifest.some((e) => e.path === '/docs')).toBe(true);
    expect(manifest.some((e) => e.path === '/docs/guides/deploy')).toBe(true);
  });

  test('DocsNav renders grouped links', () => {
    const component = render(
      <MemoryRouter>
        <DocsNav groups={buildDocsNav(manifest, 'docs')} />
      </MemoryRouter>,
    );

    expect(component.getByText('General')).toBeInTheDocument();
    expect(component.getByText('Guides')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Getting Started' }),
    ).toHaveAttribute('href', '/docs/getting-started');
  });

  test('DocPageView renders the Markdown body', () => {
    const overview = manifest.find((e) => e.path === '/docs');
    if (!overview) throw new Error('fixture missing overview');

    const component = render(<DocPageView entry={overview} />);

    expect(
      component.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeInTheDocument();
  });

  test('DocPageView content is present in server-rendered HTML (SSR)', () => {
    const gettingStarted = manifest.find(
      (e) => e.path === '/docs/getting-started',
    );
    if (!gettingStarted) throw new Error('fixture missing getting-started');

    const html = renderToStaticMarkup(<DocPageView entry={gettingStarted} />);

    expect(html).toMatch(/<h1/);
    expect(html).toMatch(/<table/); // GFM table from the fixture
  });

  test('FaqView renders questions and reveals the answer on click', async () => {
    const user = userEvent.setup();
    const component = render(<FaqView entries={faqEntries} />);

    const question = component.getByRole('button', {
      name: 'How does billing work?',
    });
    expect(question).toBeInTheDocument();

    await user.click(question);

    expect(component.getByText(/Billing is monthly/i)).toBeInTheDocument();
  });

  test('FaqView groups draft entries by group when drafts are included', () => {
    // includeDrafts surfaces the draft FAQ entry, which must flow through the
    // FaqView grouping path (grouped under its frontmatter `group`).
    const draftModules: DocsContentModules = {
      './docs-content/faq/secret.md': md(
        'title: A secret question?\ngroup: Hidden\ndraft: true',
        'A secret answer.',
      ),
    };

    const draftManifest = buildDocsManifest({
      includeDrafts: true,
      modules: draftModules,
    });
    const draftFaq = draftManifest.filter((entry) => entry.section === 'faq');

    const component = render(<FaqView entries={draftFaq} />);

    expect(component.getByText('Hidden')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'A secret question?' }),
    ).toBeInTheDocument();
  });

  // Regression guard for the docs-layer security boundary: raw HTML embedded in
  // a doc's Markdown body must never reach the rendered output as live markup
  // (DocPageView delegates to MarkdownRenderer, which uses `format: 'md'` with no
  // rehype-raw). If this fails, an XSS sink has been opened at the docs layer.
  test('DocPageView never emits raw HTML from source as live markup', () => {
    const xssEntry = buildDocsManifest({
      modules: {
        './docs-content/docs/xss.md': md(
          'title: XSS',
          'Hello <script>alert(1)</script> and <img src=x onerror=alert(1)>.',
        ),
      },
    })[0];

    const html = renderToStaticMarkup(<DocPageView entry={xssEntry} />);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<img');
  });
});
