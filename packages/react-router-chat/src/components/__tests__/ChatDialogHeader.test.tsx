import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatDialogHeader } from '../ChatDialogHeader';
import type { ChatDialogHeaderProps } from '../ChatDialogHeader';
import type { AgentConversationListItem } from '../../types';

const CONVERSATIONS: readonly AgentConversationListItem[] = [
  {
    id: 'conv-1',
    status: 'active',
    title: 'Refactor the auth guard',
    updatedAt: '2026-07-29T12:00:00.000Z',
  },
];

// The header renders a Tooltip for "New chat" and (via ChatConversationSheet) a
// tooltipped trigger, so mount under a TooltipProvider (mirrors real usage via
// GlobalProviders).
const renderHeader = (
  overrides: Partial<ChatDialogHeaderProps> = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatDialogHeader title="Chat" {...overrides} />
    </TooltipProvider>,
  );

describe('ChatDialogHeader', () => {
  test('renders the title', () => {
    const component = renderHeader();

    expect(component.getByText('Chat')).toBeInTheDocument();
  });

  test('hides the New chat control when onStartNewChat is omitted', () => {
    const component = renderHeader();

    expect(
      component.queryByRole('button', { name: 'New chat' }),
    ).not.toBeInTheDocument();
  });

  test('calls onStartNewChat when the New chat button is clicked', async () => {
    const onStartNewChat = vi.fn();
    const component = renderHeader({ onStartNewChat });
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'New chat' }));

    expect(onStartNewChat).toHaveBeenCalledTimes(1);
  });

  test('hides the conversations switcher when conversationSidebar is omitted', () => {
    const component = renderHeader();

    expect(
      component.queryByTestId('ChatDialog-conversations-trigger'),
    ).not.toBeInTheDocument();
  });

  test('renders the conversations switcher trigger and opens the sidebar sheet', async () => {
    const onSelect = vi.fn();
    const component = renderHeader({
      conversationSidebar: {
        conversations: CONVERSATIONS,
        onDelete: vi.fn(),
        onNewChat: vi.fn(),
        onRename: vi.fn(),
        onSelect,
        totalCount: CONVERSATIONS.length,
      },
    });
    const user = userEvent.setup();

    const trigger = component.getByTestId('ChatDialog-conversations-trigger');
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);
    await user.click(
      await component.findByTestId('ChatConversationSidebar-select-conv-1'),
    );

    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });
});
