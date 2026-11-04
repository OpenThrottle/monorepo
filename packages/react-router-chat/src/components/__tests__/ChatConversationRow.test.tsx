import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { AgentConversationListItem } from '../../types';
import type { ChatConversationRowProps } from '../ChatConversationRow';
import { ChatConversationRow } from '../ChatConversationRow';

const CONVERSATION: AgentConversationListItem = {
  id: 'conv-1',
  status: 'active',
  title: 'Refactor the auth guard',
  updatedAt: '2026-07-29T12:00:00.000Z',
};

const renderRow = (
  overrides: Partial<ChatConversationRowProps> = {},
): RenderResult =>
  render(
    <ChatConversationRow
      conversation={CONVERSATION}
      draftTitle=""
      isActive={false}
      isEditing={false}
      onCancelRename={vi.fn()}
      onDraftTitleChange={vi.fn()}
      onRenameKeyDown={vi.fn()}
      onRequestDelete={vi.fn()}
      onSelect={vi.fn()}
      onStartRename={vi.fn()}
      {...overrides}
    />,
  );

describe('ChatConversationRow', () => {
  test('renders the conversation title', () => {
    const component = renderRow();

    expect(component.getByText('Refactor the auth guard')).toBeInTheDocument();
  });

  test('falls back to Untitled conversation when the title is null', () => {
    const component = renderRow({
      conversation: { ...CONVERSATION, title: null },
    });

    expect(component.getByText('Untitled conversation')).toBeInTheDocument();
  });

  test('calls onSelect when the row is clicked', async () => {
    const onSelect = vi.fn();
    const component = renderRow({ onSelect });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatConversationSidebar-select-conv-1'),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('calls onStartRename from the rename button', async () => {
    const onStartRename = vi.fn();
    const component = renderRow({ onStartRename });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatConversationSidebar-rename-conv-1'),
    );

    expect(onStartRename).toHaveBeenCalledTimes(1);
  });

  test('calls onRequestDelete from the delete button', async () => {
    const onRequestDelete = vi.fn();
    const component = renderRow({ onRequestDelete });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatConversationSidebar-delete-conv-1'),
    );

    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  describe('rename/delete controls on touch vs hover', () => {
    const TEST_IDS = [
      'ChatConversationSidebar-rename-conv-1',
      'ChatConversationSidebar-delete-conv-1',
    ] as const;

    test.each(TEST_IDS)(
      '%s is hidden and inert on hover-capable devices until hover or focus',
      (testId) => {
        const component = renderRow();
        const button = component.getByTestId(testId);

        expect(button).toHaveClass('opacity-0', 'pointer-events-none');
        expect(button).toHaveClass(
          'group-hover/row:opacity-100',
          'group-hover/row:pointer-events-auto',
          'focus-visible:opacity-100',
          'focus-visible:pointer-events-auto',
        );
      },
    );

    test.each(TEST_IDS)(
      '%s is visible and tappable when the device has no hover',
      (testId) => {
        const component = renderRow();
        const button = component.getByTestId(testId);

        expect(button).toHaveClass(
          '[@media(hover:none)]:opacity-100',
          '[@media(hover:none)]:pointer-events-auto',
        );
      },
    );

    test.each(TEST_IDS)(
      '%s grows to a 44px target on touch without changing the desktop size',
      (testId) => {
        const component = renderRow();
        const button = component.getByTestId(testId);

        expect(button).toHaveClass(
          'pointer-coarse:size-11',
          '[@media(hover:none)]:size-11',
        );
        expect(button).toHaveClass('h-6');
      },
    );

    test('lets the title truncate so enlarged targets do not widen the row', () => {
      const component = renderRow();
      const select = component.getByTestId(
        'ChatConversationSidebar-select-conv-1',
      );

      expect(select).toHaveClass('min-w-0');
      expect(select.parentElement).toHaveClass('min-w-0', 'flex-1');
      expect(component.getByText('Refactor the auth guard')).toHaveClass(
        'truncate',
      );
    });
  });

  test('sets aria-current when active', () => {
    const component = renderRow({ isActive: true });

    expect(
      component.getByTestId('ChatConversationSidebar-select-conv-1'),
    ).toHaveAttribute('aria-current', 'true');
  });

  describe('editing mode', () => {
    test('renders an input with the draft title instead of the row', () => {
      const component = renderRow({ draftTitle: 'New title', isEditing: true });

      const input = component.getByTestId(
        'ChatConversationSidebar-rename-input-conv-1',
      );
      expect(input).toHaveValue('New title');
      expect(
        component.queryByTestId('ChatConversationSidebar-select-conv-1'),
      ).not.toBeInTheDocument();
    });

    test('calls onDraftTitleChange as the input value changes', async () => {
      const onDraftTitleChange = vi.fn();
      const component = renderRow({
        isEditing: true,
        onDraftTitleChange,
      });
      const user = userEvent.setup();

      await user.type(
        component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
        'x',
      );

      expect(onDraftTitleChange).toHaveBeenCalledWith('x');
    });

    test('calls onCancelRename on blur', async () => {
      const onCancelRename = vi.fn();
      const component = renderRow({ isEditing: true, onCancelRename });
      const user = userEvent.setup();

      await user.click(
        component.getByTestId('ChatConversationSidebar-rename-input-conv-1'),
      );
      await user.tab();

      expect(onCancelRename).toHaveBeenCalledTimes(1);
    });

    test('calls onRenameKeyDown on key presses', async () => {
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
