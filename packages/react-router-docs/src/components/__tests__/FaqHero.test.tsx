import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { FaqHero } from '../FaqHero';
import { FaqView } from '../FaqView';
import { buildFaqCategories } from '../../utils/faqCategories';
import type { DocEntry } from '../../utils/buildDocsManifest';
import type { FaqCategory } from '../../utils/faqCategories';

const categories: readonly FaqCategory[] = [
  { id: '00-general', label: '00. General' },
  { id: '01-local-development', label: '01. Local Development' },
];

describe('FaqHero', () => {
  test('renders the description and category jump links', () => {
    const component = render(
      <FaqHero categories={categories} description="Common questions." />,
    );

    expect(component.getByText('Common questions.')).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'General' })).toHaveAttribute(
      'href',
      '#00-general',
    );
    expect(
      component.getByRole('link', { name: 'Local Development' }),
    ).toHaveAttribute('href', '#01-local-development');
  });

  test('category ids match the anchors FaqView renders on each section', () => {
    const entry: DocEntry = {
      content: 'An answer.',
      description: null,
      draft: false,
      group: '00. General',
      order: 1,
      path: '/faq',
      section: 'faq',
      slug: 'what',
      title: 'What?',
    };

    const [category] = buildFaqCategories([entry]);
    const component = render(<FaqView entries={[entry]} />);

    // Attribute selector (not `#id`) because ids can start with a digit.
    expect(
      component.container.querySelector(`[id="${category.id}"]`),
    ).not.toBeNull();
  });
});
