import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatConversationSidebar } from '../ChatConversationSidebar';
import type { ChatConversationSidebarProps } from '../ChatConversationSidebar';
import type { AgentConversationListItem } from '../../types';

const CONVERSATIONS: readonly AgentConversationListItem[] = [
  {
    id: 'conv-1',
    status: 'active',
    title: 'Refactor the auth guard',
    updatedAt: '2026-07-29T12:00:00.000Z',
  },
  {
    id: 'conv-2',
    status: 'active',
    title: null,
    updatedAt: '2026-07-28T12:00:00.000Z',
  },
];

const renderSidebar = (
  overrides: Partial<ChatConversationSidebarProps> = {},
): RenderResult =>
  render(
    <ChatConversationSidebar
      conversations={CONVERSATIONS}
      onDelete={vi.fn()}
      onNewChat={vi.fn()}
      onRename={vi.fn()}
      onSelect={vi.fn()}
      totalCount={CONVERSATIONS.length}
      {...overrides}
    />,
  );

describe('ChatConversationSidebar', () => {
  test('renders a row per conversation with an Untitled fallback', () => {
    const component = renderSidebar();

    expect(
      component.getByTestId('ChatConversationSidebar'),
    ).toBeInTheDocument();
    expect(component.getByText('Refactor the auth guard')).toBeInTheDocument();
    expect(component.getByText('Untitled conversation')).toBeInTheDocument();
  });

  test('calls onSelect when a row is clicked', async () => {
    const onSelect = vi.fn();
    const component = renderSidebar({ onSelect });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatConversationSidebar-select-conv-1'),
    );

    expect(onSelect).toHaveBeenCalledWith('conv-1');
  });

  test('calls onNewChat from the New chat button', async () => {
    const onNewChat = vi.fn();
    const component = renderSidebar({ onNewChat });
    const user = userEvent.setup();

    await user.click(component.getByTestId('ChatConversationSidebar-new-chat'));

    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  describe('inline rename', () => {
    test('commits a trimmed title on Enter', async () => {
      const onRename = vi.fn();
      const component = renderSidebar({ onRename });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('ChatConversationSidebar-rename-conv-1'),
      );
      const input = component.getByTestId(
        'ChatConversationSidebar-rename-input-conv-1',
      );
      await user.clear(input);
      await user.type(input, '  Renamed thread  {Enter}');

      expect(onRename).toHaveBeenCalledWith('conv-1', 'Renamed thread');
    });

    test('cancels on Escape without calling onRename', async () => {
      const onRename = vi.fn();
      const component = renderSidebar({ onRename });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('ChatConversationSidebar-rename-conv-1'),
      );
      const input = component.getByTestId(
        'ChatConversationSidebar-rename-input-conv-1',
      );
      await user.clear(input);
      await user.type(input, 'nope{Escape}');

      expect(onRename).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('soft-deletes only after confirming in the dialog', async () => {
      const onDelete = vi.fn();
      const component = renderSidebar({ onDelete });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('ChatConversationSidebar-delete-conv-1'),
      );
      // Not deleted until confirmed.
      expect(onDelete).not.toHaveBeenCalled();

      await user.click(
        component.getByTestId('ChatConversationSidebar-confirm-delete'),
      );

      expect(onDelete).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('pagination', () => {
    test('shows Load more when loaded rows are fewer than totalCount', async () => {
      const onLoadMore = vi.fn();
      const component = renderSidebar({ onLoadMore, totalCount: 5 });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('ChatConversationSidebar-load-more'),
      );

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    test('hides Load more when all rows are loaded', () => {
      const component = renderSidebar({
        onLoadMore: vi.fn(),
        totalCount: CONVERSATIONS.length,
      });

      expect(
        component.queryByTestId('ChatConversationSidebar-load-more'),
      ).not.toBeInTheDocument();
    });
  });

  describe('states', () => {
    test('renders the empty state when there are no conversations', () => {
      const component = renderSidebar({ conversations: [], totalCount: 0 });

      expect(
        component.getByTestId('ChatConversationSidebar-empty'),
      ).toBeInTheDocument();
    });

    test('renders skeletons while loading', () => {
      const component = renderSidebar({ conversations: [], isLoading: true });

      expect(
        component.getByTestId('ChatConversationSidebar-loading'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatConversationSidebar-empty'),
      ).not.toBeInTheDocument();
    });
  });
});
