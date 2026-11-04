import userEvent from '@testing-library/user-event';
import * as React from 'react';
import type { Blocker } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostUnsavedChangesDialog } from '../BlogPostUnsavedChangesDialog';

const blocked = (): Blocker & { readonly state: 'blocked' } => ({
  location: {
    hash: '',
    key: 'next',
    pathname: '/blog',
    search: '',
    state: null,
  },
  proceed: vi.fn(),
  reset: vi.fn(),
  state: 'blocked',
});

describe('BlogPostUnsavedChangesDialog Component', () => {
  test('stays closed while nothing is blocked', () => {
    const component = renderWithProviders(
      <BlogPostUnsavedChangesDialog
        blocker={{
          location: undefined,
          proceed: undefined,
          reset: undefined,
          state: 'unblocked',
        }}
      />,
    );

    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('keeps editing or leaves on request', async () => {
    const blocker = blocked();
    const component = renderWithProviders(
      <BlogPostUnsavedChangesDialog blocker={blocker} />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Keep editing' }));
    await user.click(
      component.getByRole('button', { name: 'Leave without saving' }),
    );

    expect(blocker.reset).toHaveBeenCalledTimes(1);
    expect(blocker.proceed).toHaveBeenCalledTimes(1);
  });
});
