import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocPageView } from '../DocPageView';
import type { DocsNavItem } from '../../utils/buildDocsNav';
import type { DocEntry } from '../../utils/buildDocsManifest';

const entry: DocEntry = {
  content: '# Title\n\n## Setup\n\nSome body text.',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/docs/example',
  section: 'docs',
  slug: 'example',
  title: 'Title',
};

const sequence: readonly DocsNavItem[] = [
  { path: '/docs/getting-started', title: 'Getting Started' },
  { path: '/docs/example', title: 'Title' },
  { path: '/docs/architecture', title: 'Architecture' },
];

const renderPage = (props: React.ComponentProps<typeof DocPageView>) =>
  render(
    <MemoryRouter>
      <DocPageView {...props} />
    </MemoryRouter>,
  );

describe('DocPageView', () => {
  test('renders the root container and the Markdown body', () => {
    const component = renderPage({ entry });

    expect(component.getByTestId('DocPageView')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 1, name: 'Title' }),
    ).toBeInTheDocument();
  });

  test('omits the TOC rail and heading ids when toc is off (default)', () => {
    const component = renderPage({ entry });

    expect(
      component.queryByRole('navigation', { name: 'On this page' }),
    ).not.toBeInTheDocument();
    expect(component.container.querySelector('#setup')).toBeNull();
  });

  test('renders the TOC rail and heading ids when toc is on', () => {
    const component = renderPage({ entry, toc: true });

    expect(
      component.getByRole('navigation', { name: 'On this page' }),
    ).toBeInTheDocument();
    expect(component.container.querySelector('#setup')).not.toBeNull();
  });

  test('omits pager links when prevNext is off (default)', () => {
    const component = renderPage({ entry, sequence });

    expect(component.queryByRole('link')).not.toBeInTheDocument();
  });

  test('renders prev/next pager links when prevNext is on with a sequence', () => {
    const component = renderPage({ entry, prevNext: true, sequence });

    expect(
      component.getByRole('link', { name: /Getting Started/ }),
    ).toHaveAttribute('href', '/docs/getting-started');
    expect(
      component.getByRole('link', { name: /Architecture/ }),
    ).toHaveAttribute('href', '/docs/architecture');
  });

  test('omits pager links when prevNext is on but no sequence is given', () => {
    const component = renderPage({ entry, prevNext: true });

    expect(component.queryByRole('link')).not.toBeInTheDocument();
  });
});
