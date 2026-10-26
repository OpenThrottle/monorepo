import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostSeoFields } from '../BlogPostSeoFields';

describe('BlogPostSeoFields Component', () => {
  test('renders the SEO title and description', () => {
    const component = renderWithProviders(
      <BlogPostSeoFields
        errors={{}}
        onChange={vi.fn()}
        values={{ seoDescription: 'Desc', seoTitle: 'Title' }}
      />,
    );

    expect(
      component.getByRole('group', { name: 'Search & sharing' }),
    ).toBeInTheDocument();
    expect(component.getByRole('textbox', { name: 'SEO title' })).toHaveValue(
      'Title',
    );
    expect(
      component.getByRole('textbox', { name: 'SEO description' }),
    ).toHaveValue('Desc');
  });
});
