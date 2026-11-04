import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostTextField } from '../BlogPostTextField';

describe('BlogPostTextField Component', () => {
  test('reports edits with the field name', async () => {
    const onChange = vi.fn();
    const component = renderWithProviders(
      <BlogPostTextField
        error={undefined}
        field="title"
        label="Title"
        onChange={onChange}
        value=""
      />,
    );

    await userEvent
      .setup()
      .type(component.getByRole('textbox', { name: 'Title' }), 'A');

    expect(onChange).toHaveBeenCalledWith('title', 'A');
  });

  test('marks the input invalid and describes it with the error', () => {
    const component = renderWithProviders(
      <BlogPostTextField
        error="Too short"
        field="slug"
        hint="Kebab case"
        label="Slug"
        onChange={vi.fn()}
        prefix="/blog/"
        value="x"
      />,
    );
    const input = component.getByRole('textbox', { name: 'Slug' });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Too short');
    expect(component.getByText('/blog/')).toBeInTheDocument();
    expect(component.queryByText('Kebab case')).not.toBeInTheDocument();
  });

  test('renders a textarea when multiline', () => {
    const component = renderWithProviders(
      <BlogPostTextField
        error={undefined}
        field="excerpt"
        label="Excerpt"
        multiline={true}
        onChange={vi.fn()}
        value="Summary"
      />,
    );

    expect(component.getByRole('textbox', { name: 'Excerpt' }).tagName).toBe(
      'TEXTAREA',
    );
  });
});
