import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostStaleWriteDialog } from '../BlogPostStaleWriteDialog';

describe('BlogPostStaleWriteDialog Component', () => {
  test('offers Reload and Overwrite', async () => {
    const onOverwrite = vi.fn();
    const onReload = vi.fn();
    const component = renderWithProviders(
      <BlogPostStaleWriteDialog
        isOverwriting={false}
        onDismiss={vi.fn()}
        onOverwrite={onOverwrite}
        onReload={onReload}
        open={true}
      />,
    );
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'Reload' }));
    await user.click(component.getByRole('button', { name: 'Overwrite' }));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onOverwrite).toHaveBeenCalledTimes(1);
  });

  test('locks both choices while overwriting', () => {
    const component = renderWithProviders(
      <BlogPostStaleWriteDialog
        isOverwriting={true}
        onDismiss={vi.fn()}
        onOverwrite={vi.fn()}
        onReload={vi.fn()}
        open={true}
      />,
    );

    expect(component.getByRole('button', { name: 'Reload' })).toBeDisabled();
    expect(
      component.getByRole('button', { name: /Overwriting/ }),
    ).toBeDisabled();
  });
});
