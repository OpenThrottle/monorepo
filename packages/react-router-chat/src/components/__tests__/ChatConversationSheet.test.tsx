import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatConversationSheet } from '../ChatConversationSheet';
import type { ChatConversationSheetProps } from '../ChatConversationSheet';
import type { AgentConversationListItem } from '../../types';

const CONVERSATIONS: readonly AgentConversationListItem[] = [
  {
    id: 'conv-1',
    status: 'active',
    title: 'Refactor the auth guard',
    updatedAt: '2026-07-29T12:00:00.000Z',
  },
];

// The trigger renders a Tooltip, so mount under a TooltipProvider (mirrors
// real usage via GlobalProviders).
const renderSheet = (
  overrides: Partial<ChatConversationSheetProps> = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatConversationSheet
        conversations={CONVERSATIONS}
        onDelete={vi.fn()}
        onNewChat={vi.fn()}
        onRename={vi.fn()}
        onSelect={vi.fn()}
        totalCount={CONVERSATIONS.length}
        {...overrides}
      />
    </TooltipProvider>,
  );

describe('ChatConversationSheet', () => {
  test('keeps the conversation list closed until the trigger is clicked', async () => {
    const component = renderSheet();
    const user = userEvent.setup();

    expect(
      component.getByTestId('ChatConversationSheet-trigger'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatConversationSheet'),
    ).not.toBeInTheDocument();

    await user.click(component.getByTestId('ChatConversationSheet-trigger'));

    expect(
      await component.findByTestId('ChatConversationSheet'),
    ).toBeInTheDocument();
    expect(component.getByText('Refactor the auth guard')).toBeInTheDocument();
  });

  test('selecting a conversation calls onSelect and closes the sheet', async () => {
    const onSelect = vi.fn();
    const component = renderSheet({ onSelect });
    const user = userEvent.setup();

    await user.click(component.getByTestId('ChatConversationSheet-trigger'));
    await user.click(
      await component.findByTestId('ChatConversationSidebar-select-conv-1'),
    );

    expect(onSelect).toHaveBeenCalledWith('conv-1');
    await waitFor(() =>
      expect(
        component.queryByTestId('ChatConversationSheet'),
      ).not.toBeInTheDocument(),
    );
  });

  test('New chat calls onNewChat and closes the sheet', async () => {
    const onNewChat = vi.fn();
    const component = renderSheet({ onNewChat });
    const user = userEvent.setup();

    await user.click(component.getByTestId('ChatConversationSheet-trigger'));
    await user.click(
      await component.findByTestId('ChatConversationSheet-new-chat'),
    );

    expect(onNewChat).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        component.queryByTestId('ChatConversationSheet'),
      ).not.toBeInTheDocument(),
    );
  });
});
