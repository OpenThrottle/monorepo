import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostLifecycleConfirmDialog } from '../BlogPostLifecycleConfirmDialog';

describe('BlogPostLifecycleConfirmDialog Component', () => {
  test('is closed with nothing to confirm', () => {
    const component = renderWithProviders(
      <BlogPostLifecycleConfirmDialog
        action={null}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(component.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('unpublish says it returns to draft and leaves the site at once', async () => {
    const onConfirm = vi.fn();
    const component = renderWithProviders(
      <BlogPostLifecycleConfirmDialog
        action="unpublish"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(
      component.getByRole('alertdialog', { name: 'Unpublish this post?' }),
    ).toHaveTextContent(/goes back to draft and disappears from the site/);

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'Unpublish post' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('archive says it is hidden but its publish date is kept', () => {
    const component = renderWithProviders(
      <BlogPostLifecycleConfirmDialog
        action="archive"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(component.getByRole('alertdialog')).toHaveTextContent(
      /hidden from the site.*publish date is kept/,
    );
  });

  test('Cancel closes without confirming', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const component = renderWithProviders(
      <BlogPostLifecycleConfirmDialog
        action="archive"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
