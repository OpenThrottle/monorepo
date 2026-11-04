import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { MOCK_BLOG_TAGS } from '~/routing/blog/data/mock.blog-posts';
import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostTagsField } from '../BlogPostTagsField';

describe('BlogPostTagsField Component', () => {
  test('shows the selected tags by name', () => {
    const component = renderWithProviders(
      <BlogPostTagsField
        error={undefined}
        onChange={vi.fn()}
        tags={MOCK_BLOG_TAGS}
        value={['releases']}
      />,
    );

    expect(component.getByText('Releases')).toBeInTheDocument();
    expect(component.queryByText('Engineering')).not.toBeInTheDocument();
  });

  test('adds a tag picked from the list', async () => {
    const onChange = vi.fn();
    const component = renderWithProviders(
      <BlogPostTagsField
        error={undefined}
        onChange={onChange}
        tags={MOCK_BLOG_TAGS}
        value={['releases']}
      />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Choose tags' }));
    await user.click(
      await component.findByRole('option', { name: 'Engineering' }),
    );

    expect(onChange).toHaveBeenCalledWith(['releases', 'engineering']);
  });
});
