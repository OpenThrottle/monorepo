import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatConversationDeleteDialog } from '../ChatConversationDeleteDialog';
import type { ChatConversationDeleteDialogProps } from '../ChatConversationDeleteDialog';

const renderDialog = (
  overrides: Partial<ChatConversationDeleteDialogProps> = {},
): RenderResult =>
  render(
    <ChatConversationDeleteDialog
      onConfirm={vi.fn()}
      onDismiss={vi.fn()}
      open={true}
      {...overrides}
    />,
  );

describe('ChatConversationDeleteDialog', () => {
  test('renders nothing when closed', () => {
    const component = renderDialog({ open: false });

    expect(
      component.queryByTestId('ChatConversationSidebar-confirm-delete'),
    ).not.toBeInTheDocument();
  });

  test('renders the confirm copy when open', () => {
    const component = renderDialog();

    expect(component.getByText('Delete conversation?')).toBeInTheDocument();
    expect(
      component.getByText(
        'This removes the conversation from your list. Its messages are retained and can be restored later.',
      ),
    ).toBeInTheDocument();
  });

  test('calls onConfirm when the delete action is clicked', async () => {
    const onConfirm = vi.fn();
    const component = renderDialog({ onConfirm });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatConversationSidebar-confirm-delete'),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onDismiss when Cancel is clicked', async () => {
    const onDismiss = vi.fn();
    const component = renderDialog({ onDismiss });
    const user = userEvent.setup();

    await user.click(component.getByText('Cancel'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
