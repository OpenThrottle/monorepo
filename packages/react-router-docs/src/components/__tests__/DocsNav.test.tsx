import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocsNav } from '../DocsNav';
import type { DocsNavGroup } from '../../utils/buildDocsNav';

const groups: readonly DocsNavGroup[] = [
  {
    items: [
      { path: '/docs/getting-started', title: 'Getting Started' },
      { path: '/docs/installation', title: 'Installation' },
    ],
    label: '00. General',
  },
  {
    items: [{ path: '/docs/guides/deploy', title: 'Deploy' }],
    label: 'Guides',
  },
];

const renderNav = (
  props: React.ComponentProps<typeof DocsNav>,
  initialEntry = '/docs/getting-started',
) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DocsNav {...props} />
    </MemoryRouter>,
  );

describe('DocsNav', () => {
  test('renders a nav landmark labeled Documentation', () => {
    const component = renderNav({ groups });

    expect(
      component.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
  });

  test('strips numeric ordering prefixes from group labels', () => {
    const component = renderNav({ groups });

    expect(component.getByText('General')).toBeInTheDocument();
    expect(component.queryByText('00. General')).not.toBeInTheDocument();
    expect(component.getByText('Guides')).toBeInTheDocument();
  });

  test('renders a link per item pointing at its path', () => {
    const component = renderNav({ groups });

    expect(
      component.getByRole('link', { name: 'Getting Started' }),
    ).toHaveAttribute('href', '/docs/getting-started');
    expect(
      component.getByRole('link', { name: 'Installation' }),
    ).toHaveAttribute('href', '/docs/installation');
    expect(component.getByRole('link', { name: 'Deploy' })).toHaveAttribute(
      'href',
      '/docs/guides/deploy',
    );
  });

  test('marks the active link with aria-current', () => {
    const component = renderNav({ groups }, '/docs/getting-started');

    expect(
      component.getByRole('link', { name: 'Getting Started' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      component.getByRole('link', { name: 'Installation' }),
    ).not.toHaveAttribute('aria-current');
  });

  test('renders nothing but the landmark when there are no groups', () => {
    const component = renderNav({ groups: [] });

    expect(
      component.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(component.queryAllByRole('link')).toHaveLength(0);
  });
});
