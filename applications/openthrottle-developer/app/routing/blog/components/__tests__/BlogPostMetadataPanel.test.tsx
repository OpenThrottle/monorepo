import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import {
  MOCK_BLOG_AUTHORS,
  MOCK_BLOG_TAGS,
  MOCK_EDITOR_DRAFT,
} from '~/routing/blog/data/mock.blog-posts';
import { toBlogPostEditorValues } from '~/routing/blog/utils/editor';
import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostMetadataPanel } from '../BlogPostMetadataPanel';

const renderPanel = (onFieldChange = vi.fn()) =>
  renderWithProviders(
    <BlogPostMetadataPanel
      authors={MOCK_BLOG_AUTHORS}
      errors={{ slug: 'Taken' }}
      onFieldChange={onFieldChange}
      tags={MOCK_BLOG_TAGS}
      values={toBlogPostEditorValues(MOCK_EDITOR_DRAFT)}
    />,
  );

describe('BlogPostMetadataPanel Component', () => {
  test('renders every metadata field with its value and error', () => {
    const component = renderPanel();

    expect(component.getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Hello world',
    );
    expect(
      component.getByRole('textbox', { name: 'Slug' }),
    ).toHaveAccessibleDescription('Taken');
    expect(component.getByRole('textbox', { name: 'Excerpt' })).toHaveValue(
      'A short summary.',
    );
    expect(
      component.getByRole('combobox', { name: 'Author' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('textbox', { name: 'Cover image URL' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('textbox', { name: 'SEO title' }),
    ).toBeInTheDocument();
  });

  test('reports edits by field', async () => {
    const onFieldChange = vi.fn();
    const component = renderPanel(onFieldChange);

    await userEvent
      .setup()
      .type(component.getByRole('textbox', { name: 'Excerpt' }), '!');

    expect(onFieldChange).toHaveBeenCalledWith('excerpt', 'A short summary.!');
  });

  test('collapses to give the editor room', async () => {
    const component = renderPanel();

    await userEvent
      .setup()
      .click(
        component.getByRole('button', { name: 'Show or hide post details' }),
      );

    expect(
      component.queryByRole('textbox', { name: 'Title' }),
    ).not.toBeInTheDocument();
  });
});
