import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocsLanding } from '../DocsLanding';
import type { DocsNavGroup } from '../../utils/buildDocsNav';
import type { DocEntry } from '../../utils/buildDocsManifest';

const groups: readonly DocsNavGroup[] = [
  {
    items: [
      { path: '/docs', title: 'Overview' },
      { path: '/docs/getting-started', title: 'Getting Started' },
    ],
    label: '00. Getting Started',
  },
  {
    items: [{ path: '/docs/architecture', title: 'Architecture' }],
    label: '01. Concepts',
  },
];

const intro: DocEntry = {
  content: '# Documentation\n\nWelcome to the docs.',
  description: null,
  draft: false,
  group: '00. Getting Started',
  order: 1,
  path: '/docs',
  section: 'docs',
  slug: '',
  title: 'Documentation',
};

describe('DocsLanding', () => {
  test('renders a card per group with formatted labels and page links', () => {
    const component = render(
      <MemoryRouter>
        <DocsLanding groups={groups} />
      </MemoryRouter>,
    );

    expect(component.getByText('Concepts')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /Architecture/ }),
    ).toHaveAttribute('href', '/docs/architecture');
    expect(component.getByRole('link', { name: /Overview/ })).toHaveAttribute(
      'href',
      '/docs',
    );
  });

  test('renders the optional intro Markdown above the grid', () => {
    const component = render(
      <MemoryRouter>
        <DocsLanding groups={groups} intro={intro} />
      </MemoryRouter>,
    );

    expect(component.getByText('Welcome to the docs.')).toBeInTheDocument();
  });
});
