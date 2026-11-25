import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../../data/chat-conversation-sidebar.copy';
import type {
  AgentConversationGroup,
  AgentConversationListItem,
} from '../../types';
import type { ChatConversationRowProps } from '../ChatConversationRow';
import { ChatConversationRow } from '../ChatConversationRow';

const CONVERSATION: AgentConversationListItem = {
  groupId: null,
  id: 'conv-1',
  pinned: false,
  status: 'active',
  title: 'Refactor the auth guard',
  updatedAt: '2026-07-29T12:00:00.000Z',
};

const GROUPS: readonly AgentConversationGroup[] = [
  { id: 'g1', name: 'Launch prep', sortOrder: 1000 },
  { id: 'g2', name: 'Plan triage', sortOrder: 2000 },
];

const copy = CHAT_CONVERSATION_SIDEBAR_COPY;

const renderRow = (
  overrides: Partial<ChatConversationRowProps> = {},
): RenderResult => {
  return render(
    <ChatConversationRow
      conversation={CONVERSATION}
      draftTitle=""
      groups={GROUPS}
      indented={false}
      isActive={false}
      isEditing={false}
      onCommitRename={vi.fn()}
      onDraftTitleChange={vi.fn()}
      onMoveToGroup={vi.fn()}
      onNewGroup={vi.fn()}
      onRenameKeyDown={vi.fn()}
      onRequestDelete={vi.fn()}
      onSelect={vi.fn()}
      onStartRename={vi.fn()}
      onTogglePin={vi.fn()}
      {...overrides}
    />,
  );
};

const openMenu = async (
  component: RenderResult,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
  await user.click(
    component.getByTestId('ChatConversationSidebar-more-conv-1'),
  );
};

describe('ChatConversationRow', () => {
  test('renders the conversation title', () => {
    const component = renderRow();

    expect(component.getByText('Refactor the auth guard')).toBeInTheDocument();
  });

  test('falls back to Untitled conversation when the title is null', () => {
    const component = renderRow({
      conversation: { ...CONVERSATION, title: null },
    });

    expect(component.getByText(copy.untitled)).toBeInTheDocument();
  });

  test('calls onSelect when the title is clicked', async () => {
    const onSelect = vi.fn();
    const component = renderRow({ onSelect });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatConversationSidebar-select-conv-1'),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('double-clicking the title starts a rename', async () => {
    const onStartRename = vi.fn();
    const component = renderRow({ onStartRename });
    const user = userEvent.setup();

    await user.dblClick(
      component.getByTestId('ChatConversationSidebar-select-conv-1'),
    );

    expect(onStartRename).toHaveBeenCalledTimes(1);
  });

  test('F2 on the focused title starts a rename', async () => {
    const onStartRename = vi.fn();
    const component = renderRow({ onStartRename });
    const user = userEvent.setup();

    component.getByTestId('ChatConversationSidebar-select-conv-1').focus();
    await user.keyboard('{F2}');

    expect(onStartRename).toHaveBeenCalledTimes(1);
  });

  test('has no standalone rename or delete buttons', () => {
    const component = renderRow();

    expect(
      component.queryByTestId('ChatConversationSidebar-rename-conv-1'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ChatConversationSidebar-delete-conv-1'),
    ).not.toBeInTheDocument();
  });

  test('sets aria-current when active', () => {
    const component = renderRow({ isActive: true });

    expect(
      component.getByTestId('ChatConversationSidebar-select-conv-1'),
    ).toHaveAttribute('aria-current', 'page');
  });

  describe('more menu', () => {
    test('labels its trigger with the conversation title', () => {
      const component = renderRow();

      expect(
        component.getByRole('button', {
          name: `${copy.moreOptionsFor} Refactor the auth guard`,
        }),
      ).toBeInTheDocument();
    });

    test('Rename, Pin and Delete call their handlers', async () => {
      const onStartRename = vi.fn();
      const onTogglePin = vi.fn();
      const onRequestDelete = vi.fn();
      const component = renderRow({
        onRequestDelete,
        onStartRename,
        onTogglePin,
      });
      const user = userEvent.setup();

      await openMenu(component, user);
      await user.click(
        await component.findByRole('menuitem', { name: /Rename/ }),
      );
      await openMenu(component, user);
      await user.click(
        await component.findByRole('menuitem', { name: copy.pin }),
      );
      await openMenu(component, user);
      await user.click(
        await component.findByRole('menuitem', { name: copy.delete }),
      );

      expect(onStartRename).toHaveBeenCalledTimes(1);
      expect(onTogglePin).toHaveBeenCalledTimes(1);
      expect(onRequestDelete).toHaveBeenCalledTimes(1);
    });

    test('offers Unpin for a pinned conversation', async () => {
      const component = renderRow({
        conversation: { ...CONVERSATION, pinned: true },
      });
      const user = userEvent.setup();

      await openMenu(component, user);

      expect(
        await component.findByRole('menuitem', { name: copy.unpin }),
      ).toBeInTheDocument();
    });

    test('Move to group lists the groups and moves into the chosen one', async () => {
      const onMoveToGroup = vi.fn();
      const component = renderRow({ onMoveToGroup });
      const user = userEvent.setup();

      await openMenu(component, user);
      (
        await component.findByRole('menuitem', { name: copy.moveToGroup })
      ).focus();
      await user.keyboard('{ArrowRight}');
      await user.click(
        await component.findByRole('menuitem', { name: 'Plan triage' }),
      );

      expect(onMoveToGroup).toHaveBeenCalledWith('g2');
    });

    test('a grouped conversation can be removed from its group', async () => {
      const onMoveToGroup = vi.fn();
      const component = renderRow({
        conversation: { ...CONVERSATION, groupId: 'g1' },
        onMoveToGroup,
      });
      const user = userEvent.setup();

      await openMenu(component, user);
      (
        await component.findByRole('menuitem', { name: copy.moveToGroup })
      ).focus();
      await user.keyboard('{ArrowRight}');
      await user.click(
        await component.findByRole('menuitem', { name: copy.removeFromGroup }),
      );

      expect(onMoveToGroup).toHaveBeenCalledWith(null);
    });

    test('hides Pin and Move to group when the host offers no grouping', async () => {
      const component = renderRow({ groups: null });
      const user = userEvent.setup();

      await openMenu(component, user);
      await component.findByRole('menuitem', { name: copy.delete });

      expect(
        component.queryByRole('menuitem', { name: copy.pin }),
      ).not.toBeInTheDocument();
      expect(
        component.queryByRole('menuitem', { name: copy.moveToGroup }),
      ).not.toBeInTheDocument();
    });
  });

  describe('editing mode', () => {
    test('renders an input with the draft title instead of the row', () => {
      const component = renderRow({ draftTitle: 'New title', isEditing: true });

      expect(
        component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
      ).toHaveValue('New title');
      expect(
        component.queryByTestId('ChatConversationSidebar-select-conv-1'),
      ).not.toBeInTheDocument();
    });

    test('focuses the input', async () => {
      const component = renderRow({ isEditing: true });

      await waitFor(() => {
        expect(
          component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
        ).toHaveFocus();
      });
    });

    test('calls onDraftTitleChange as the value changes', async () => {
      const onDraftTitleChange = vi.fn();
      const component = renderRow({ isEditing: true, onDraftTitleChange });
      const user = userEvent.setup();

      await user.type(
        component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
        'x',
      );

      expect(onDraftTitleChange).toHaveBeenCalledWith('x');
    });

    test('saves on blur', async () => {
      const onCommitRename = vi.fn();
      const component = renderRow({ isEditing: true, onCommitRename });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
      );
      await user.tab();

      expect(onCommitRename).toHaveBeenCalledTimes(1);
    });

    test('passes key presses to onRenameKeyDown', async () => {
      const onRenameKeyDown = vi.fn();
      const component = renderRow({ isEditing: true, onRenameKeyDown });
      const user = userEvent.setup();

      await user.type(
        component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
        '{Enter}',
      );

      expect(onRenameKeyDown).toHaveBeenCalled();
    });
  });
});
