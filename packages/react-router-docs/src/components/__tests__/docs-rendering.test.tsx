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
});
