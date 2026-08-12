import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { FaqView } from '../FaqView';
import type { DocEntry } from '../../utils/buildDocsManifest';

const makeEntry = (overrides: Partial<DocEntry>): DocEntry => ({
  content: 'Answer body.',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/faq/question',
  section: 'faq',
  slug: 'question',
  title: 'Question?',
  ...overrides,
});

describe('FaqView', () => {
  test('renders the root container', () => {
    const component = render(<FaqView entries={[]} />);

    expect(component.getByTestId('FaqView')).toBeInTheDocument();
  });

  test('groups entries under their formatted group label as a section heading', () => {
    const entries = [
      makeEntry({
        group: '00. Billing',
        slug: 'billing-cycle',
        title: 'When am I billed?',
      }),
      makeEntry({
        group: 'Support',
        slug: 'contact-support',
        title: 'How do I contact support?',
      }),
    ];

    const component = render(<FaqView entries={entries} />);

    expect(
      component.getByRole('heading', { level: 2, name: 'Billing' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'Support' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'When am I billed?' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'How do I contact support?' }),
    ).toBeInTheDocument();
  });

  test('reveals the Markdown answer body when a question is expanded', async () => {
    const user = userEvent.setup();
    const entries = [
      makeEntry({
        content: 'Billing is monthly on the first.',
        title: 'How does billing work?',
      }),
    ];

    const component = render(<FaqView entries={entries} />);

    expect(
      component.queryByText(/Billing is monthly on the first/),
    ).not.toBeInTheDocument();

    await user.click(
      component.getByRole('button', { name: 'How does billing work?' }),
    );

    expect(
      component.getByText(/Billing is monthly on the first/),
    ).toBeInTheDocument();
  });

  test('gives each group section a deep-linkable id from its label', () => {
    const entries = [makeEntry({ group: 'Getting Started' })];

    const component = render(<FaqView entries={entries} />);

    expect(
      component.container.querySelector('#getting-started'),
    ).not.toBeNull();
  });
});
