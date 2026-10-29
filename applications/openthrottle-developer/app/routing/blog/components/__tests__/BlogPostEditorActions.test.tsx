import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import type { BlogPostEditorActionsProps } from '../BlogPostEditorActions';
import { BlogPostEditorActions } from '../BlogPostEditorActions';

const props = (
  overrides: Partial<BlogPostEditorActionsProps> = {},
): BlogPostEditorActionsProps => ({
  canSave: true,
  isDirty: true,
  isSaved: false,
  isSaving: false,
  lifecycle: null,
  onSave: vi.fn(),
  saveError: null,
  ...overrides,
});

describe('BlogPostEditorActions Component', () => {
  test('saves on click and flags unsaved changes', async () => {
    const onSave = vi.fn();
    const component = renderWithProviders(
      <BlogPostEditorActions {...props({ onSave })} />,
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: /Save draft/ }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(component.getByText('Unsaved changes')).toBeInTheDocument();
  });

  test('disables saving when there is nothing to save', () => {
    const component = renderWithProviders(
      <BlogPostEditorActions
        {...props({ canSave: false, isDirty: false, isSaved: true })}
      />,
    );

    expect(
      component.getByRole('button', { name: /Save draft/ }),
    ).toBeDisabled();
    expect(component.getByText('Saved')).toBeInTheDocument();
  });

  test('shows a save error that belongs to no field', () => {
    const component = renderWithProviders(
      <BlogPostEditorActions {...props({ saveError: 'Server down' })} />,
    );

    expect(component.getByRole('alert')).toHaveTextContent('Server down');
  });
});
