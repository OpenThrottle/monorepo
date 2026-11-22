import { Toaster } from '@openthrottle/react-router-shadcn';
import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../../data/data.chat-conversation-sidebar.copy';
import type { AgentConversationListItem } from '../../types';
import { useChatConversationSidebar } from '../useChatConversationSidebar';

const conversation: AgentConversationListItem = {
  id: 'c1',
  status: 'active',
  title: 'Existing title',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

interface RenameHarnessProps {
  readonly conversationId: string;
  readonly draftTitle: string;
  readonly onRenameKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    conversationId: string,
  ) => void;
}

/** Minimal input harness exercising `onRenameKeyDown` via real keyboard events. */
const RenameHarness = (props: RenameHarnessProps): React.ReactElement => {
  return (
    <input
      aria-label="Rename"
      onChange={() => {}}
      onKeyDown={(event) => {
        props.onRenameKeyDown(event, props.conversationId);
      }}
      value={props.draftTitle}
    />
  );
};

describe('useChatConversationSidebar', () => {
  test('starts with no editing, no draft, and no draft', () => {
    const { result } = renderHook(() =>
      useChatConversationSidebar({
        onDelete: vi.fn(),
        onRename: vi.fn(),
        onRestore: vi.fn(),
      }),
    );
    expect(result.current.editingId).toBeNull();
    expect(result.current.draftTitle).toBe('');
  });

  describe('startRename', () => {
    test('seeds the draft from the conversation title', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename: vi.fn(),
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename(conversation);
      });
      expect(result.current.editingId).toBe('c1');
      expect(result.current.draftTitle).toBe('Existing title');
    });

    test('falls back to an empty draft for a null title', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename: vi.fn(),
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename({ ...conversation, title: null });
      });
      expect(result.current.draftTitle).toBe('');
    });
  });

  describe('cancelRename', () => {
    test('clears the editing id and draft', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename: vi.fn(),
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename(conversation);
      });
      act(() => {
        result.current.cancelRename();
      });
      expect(result.current.editingId).toBeNull();
      expect(result.current.draftTitle).toBe('');
    });
  });

  describe('setDraftTitle', () => {
    test('replaces the draft text', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename: vi.fn(),
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.setDraftTitle('New draft');
      });
      expect(result.current.draftTitle).toBe('New draft');
    });
  });

  describe('onRenameKeyDown', () => {
    test('Enter commits a non-empty trimmed rename and exits editing', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename,
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraftTitle('  Renamed  ');
      });
      const component = render(
        <RenameHarness
          conversationId="c1"
          draftTitle={result.current.draftTitle}
          onRenameKeyDown={result.current.onRenameKeyDown}
        />,
      );

      await user.type(component.getByLabelText('Rename'), '{Enter}');

      expect(onRename).toHaveBeenCalledWith('c1', 'Renamed');
      expect(result.current.editingId).toBeNull();
      expect(result.current.draftTitle).toBe('');
    });

    test('Enter does not commit a whitespace-only draft', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename,
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraftTitle('   ');
      });
      const component = render(
        <RenameHarness
          conversationId="c1"
          draftTitle={result.current.draftTitle}
          onRenameKeyDown={result.current.onRenameKeyDown}
        />,
      );

      await user.type(component.getByLabelText('Rename'), '{Enter}');

      expect(onRename).not.toHaveBeenCalled();
      expect(result.current.editingId).toBeNull();
    });

    test('Escape cancels without committing', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename,
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraftTitle('Ignored');
      });
      const component = render(
        <RenameHarness
          conversationId="c1"
          draftTitle={result.current.draftTitle}
          onRenameKeyDown={result.current.onRenameKeyDown}
        />,
      );

      await user.type(component.getByLabelText('Rename'), '{Escape}');

      expect(onRename).not.toHaveBeenCalled();
      expect(result.current.editingId).toBeNull();
      expect(result.current.draftTitle).toBe('');
    });

    test('other keys are ignored', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({
          onDelete: vi.fn(),
          onRename,
          onRestore: vi.fn(),
        }),
      );
      act(() => {
        result.current.startRename(conversation);
      });
      const component = render(
        <RenameHarness
          conversationId="c1"
          draftTitle={result.current.draftTitle}
          onRenameKeyDown={result.current.onRenameKeyDown}
        />,
      );

      await user.type(component.getByLabelText('Rename'), 'a');

      expect(onRename).not.toHaveBeenCalled();
      expect(result.current.editingId).toBe('c1');
    });
  });

  describe('delete flow', () => {
    test('deleteConversation deletes at once and toasts with an Undo action', async () => {
      const onDelete = vi.fn();
      const onRestore = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete, onRename: vi.fn(), onRestore }),
      );
      const component = render(<Toaster />);
      const user = userEvent.setup();

      act(() => {
        result.current.deleteConversation(conversation);
      });

      expect(onDelete).toHaveBeenCalledWith('c1');
      expect(onRestore).not.toHaveBeenCalled();

      await user.click(
        await component.findByRole('button', {
          name: CHAT_CONVERSATION_SIDEBAR_COPY.deleteUndo,
        }),
      );

      expect(onRestore).toHaveBeenCalledWith(conversation);
    });
  });
});
