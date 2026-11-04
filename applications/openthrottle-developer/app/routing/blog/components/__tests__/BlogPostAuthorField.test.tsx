import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { MOCK_BLOG_AUTHORS } from '~/routing/blog/data/mock.blog-posts';
import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostAuthorField } from '../BlogPostAuthorField';

describe('BlogPostAuthorField Component', () => {
  test('shows the selected author by display name', () => {
    const component = renderWithProviders(
      <BlogPostAuthorField
        authors={MOCK_BLOG_AUTHORS}
        error={undefined}
        onChange={vi.fn()}
        value="grace"
      />,
    );

    expect(
      component.getByRole('combobox', { name: 'Author' }),
    ).toHaveTextContent('Grace Hopper');
  });

  test('shows "No byline" when no author is set, and an error when given one', () => {
    const component = renderWithProviders(
      <BlogPostAuthorField
        authors={MOCK_BLOG_AUTHORS}
        error="Unknown author"
        onChange={vi.fn()}
        value=""
      />,
    );

    expect(
      component.getByRole('combobox', { name: 'Author' }),
    ).toHaveTextContent('No byline');
    expect(component.getByRole('alert')).toHaveTextContent('Unknown author');
  });
});
