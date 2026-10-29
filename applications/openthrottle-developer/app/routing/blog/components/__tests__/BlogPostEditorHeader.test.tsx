import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { MOCK_EDITOR_DRAFT } from '~/routing/blog/data/mock.blog-posts';
import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostEditorHeader } from '../BlogPostEditorHeader';

describe('BlogPostEditorHeader Component', () => {
  test('shows the edited title, state, editor and the action slot', () => {
    const component = renderWithProviders(
      <BlogPostEditorHeader
        actions={<button type="button">Act</button>}
        post={{ ...MOCK_EDITOR_DRAFT, lastEditedBy: 'openthrottle-mcp' }}
        title="Edited title"
      />,
    );

    expect(
      component.getByRole('heading', { level: 1, name: 'Edited title' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('BlogPostStateBadge')).toHaveTextContent(
      'Draft',
    );
    expect(component.getByTestId('BlogEditorBadge-agent')).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Act' })).toBeInTheDocument();
  });

  test('falls back to a generic heading for a blank title', () => {
    const component = renderWithProviders(
      <BlogPostEditorHeader
        actions={null}
        post={MOCK_EDITOR_DRAFT}
        title=" "
      />,
    );

    expect(
      component.getByRole('heading', { level: 1, name: 'Post' }),
    ).toBeInTheDocument();
  });
});
