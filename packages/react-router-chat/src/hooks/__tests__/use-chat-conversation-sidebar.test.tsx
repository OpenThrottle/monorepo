import * as React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { useChatConversationSidebar } from '../use-chat-conversation-sidebar';
import type { AgentConversationListItem } from '../../types';

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
const RenameHarness = (props: RenameHarnessProps): React.ReactElement => (
  <input
    aria-label="Rename"
    onChange={() => {}}
    onKeyDown={(event) => {
      props.onRenameKeyDown(event, props.conversationId);
    }}
    value={props.draftTitle}
  />
);

describe('useChatConversationSidebar', () => {
  test('starts with no editing, no draft, and no pending delete', () => {
    const { result } = renderHook(() =>
      useChatConversationSidebar({ onDelete: vi.fn(), onRename: vi.fn() }),
    );
    expect(result.current.editingId).toBeNull();
    expect(result.current.draftTitle).toBe('');
    expect(result.current.pendingDeleteId).toBeNull();
  });

  describe('startRename', () => {
    test('seeds the draft from the conversation title', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete: vi.fn(), onRename: vi.fn() }),
      );
      act(() => {
        result.current.startRename(conversation);
      });
      expect(result.current.editingId).toBe('c1');
      expect(result.current.draftTitle).toBe('Existing title');
    });

    test('falls back to an empty draft for a null title', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete: vi.fn(), onRename: vi.fn() }),
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
        useChatConversationSidebar({ onDelete: vi.fn(), onRename: vi.fn() }),
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
        useChatConversationSidebar({ onDelete: vi.fn(), onRename: vi.fn() }),
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
        useChatConversationSidebar({ onDelete: vi.fn(), onRename }),
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
        useChatConversationSidebar({ onDelete: vi.fn(), onRename }),
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
        useChatConversationSidebar({ onDelete: vi.fn(), onRename }),
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
        useChatConversationSidebar({ onDelete: vi.fn(), onRename }),
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
    test('requestDelete queues a pending delete', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete: vi.fn(), onRename: vi.fn() }),
      );
      act(() => {
        result.current.requestDelete('c1');
      });
      expect(result.current.pendingDeleteId).toBe('c1');
    });

    test('confirmDelete invokes onDelete with the pending id and clears it', () => {
      const onDelete = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete, onRename: vi.fn() }),
      );
      act(() => {
        result.current.requestDelete('c1');
      });
      act(() => {
        result.current.confirmDelete();
      });
      expect(onDelete).toHaveBeenCalledWith('c1');
      expect(result.current.pendingDeleteId).toBeNull();
    });

    test('confirmDelete is a no-op when nothing is pending', () => {
      const onDelete = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete, onRename: vi.fn() }),
      );
      act(() => {
        result.current.confirmDelete();
      });
      expect(onDelete).not.toHaveBeenCalled();
    });

    test('resetPendingDelete dismisses without deleting', () => {
      const onDelete = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar({ onDelete, onRename: vi.fn() }),
      );
      act(() => {
        result.current.requestDelete('c1');
      });
      act(() => {
        result.current.resetPendingDelete();
      });
      expect(result.current.pendingDeleteId).toBeNull();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
