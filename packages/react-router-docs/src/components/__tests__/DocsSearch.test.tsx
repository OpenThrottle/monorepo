import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DocsSearch } from '../DocsSearch';
import type { DocEntry } from '../../utils/buildDocsManifest';

const entry = (overrides: Partial<DocEntry>): DocEntry => ({
  content: '',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/docs',
  section: 'docs',
  slug: '',
  title: 'Untitled',
  ...overrides,
});

const entries: readonly DocEntry[] = [
  entry({
    content: 'Nx and pnpm monorepo layout.',
    path: '/docs/architecture',
    slug: 'architecture',
    title: 'Architecture overview',
  }),
  entry({
    path: '/faq',
    section: 'faq',
    slug: 'what-is-openthrottle',
    title: 'What is OpenThrottle?',
  }),
];

const renderSearch = () =>
  render(
    <MemoryRouter>
      <DocsSearch entries={entries} />
    </MemoryRouter>,
  );

describe('DocsSearch', () => {
  test('renders a visible trigger', () => {
    const component = renderSearch();
    expect(
      component.getByRole('button', { name: 'Search docs…' }),
    ).toBeInTheDocument();
  });

  test('opens on click and filters to a matching entry', async () => {
    const user = userEvent.setup();
    const component = renderSearch();

    await user.click(component.getByRole('button', { name: 'Search docs…' }));

    const input = component.getByPlaceholderText('Search docs and FAQ…');
    await user.type(input, 'monorepo');

    expect(
      component.getByRole('option', { name: /Architecture overview/ }),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('option', { name: /What is OpenThrottle/ }),
    ).not.toBeInTheDocument();
  });

  test('shows an empty state for a no-match query', async () => {
    const user = userEvent.setup();
    const component = renderSearch();

    await user.click(component.getByRole('button', { name: 'Search docs…' }));
    await user.type(
      component.getByPlaceholderText('Search docs and FAQ…'),
      'zzzznope',
    );

    expect(
      component.getByText('No matching docs or FAQ entries.'),
    ).toBeInTheDocument();
  });

  test('opens on the ⌘K / Ctrl-K shortcut', async () => {
    const user = userEvent.setup();
    const component = renderSearch();

    await user.keyboard('{Control>}k{/Control}');

    expect(
      component.getByPlaceholderText('Search docs and FAQ…'),
    ).toBeInTheDocument();
  });
});
