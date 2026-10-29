import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import {
  MOCK_BLOG_AUTHORS,
  MOCK_BLOG_TAGS,
  MOCK_EDITOR_DRAFT,
} from '~/routing/blog/data/mock.blog-posts';
import { toBlogPostEditorValues } from '~/routing/blog/utils/editor';
import { renderWithProviders } from '~/testing/route-fixtures';

import type { BlogPostEditorWorkspaceProps } from '../BlogPostEditorWorkspace';
import { BlogPostEditorWorkspace } from '../BlogPostEditorWorkspace';

vi.mock('@openthrottle/react-router-editor', () => ({
  EditorWindow: () => <textarea aria-label="Markdown body" />,
}));

const props = (readOnly: boolean): BlogPostEditorWorkspaceProps => ({
  authors: MOCK_BLOG_AUTHORS,
  errors: {},
  onFieldChange: vi.fn(),
  postId: MOCK_EDITOR_DRAFT.id,
  readOnly,
  tags: MOCK_BLOG_TAGS,
  values: toBlogPostEditorValues(MOCK_EDITOR_DRAFT),
});

describe('BlogPostEditorWorkspace Component', () => {
  test('renders the form and editor beside the preview', () => {
    const component = renderWithProviders(
      <BlogPostEditorWorkspace {...props(false)} />,
    );

    expect(component.getByTestId('BlogPostMetadataPanel')).toBeInTheDocument();
    expect(
      component.getByRole('textbox', { name: 'Markdown body' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('BlogPostPreview')).toBeInTheDocument();
  });

  test('renders only the preview when read-only', () => {
    const component = renderWithProviders(
      <BlogPostEditorWorkspace {...props(true)} />,
    );

    expect(component.queryByTestId('BlogPostMetadataPanel')).toBeNull();
    expect(component.queryByTestId('BlogPostMarkdownEditor')).toBeNull();
    expect(component.getByTestId('BlogPostPreview')).toBeInTheDocument();
  });
});
