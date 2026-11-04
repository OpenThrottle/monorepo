import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  CHAT_CONVERSATION_SIDEBAR_COPY,
  CHAT_CONVERSATION_UNDO_TOAST_DURATION_MS,
} from '../../data/chat-conversation-sidebar.copy';
import type { AgentConversationListItem } from '../../types';
import type { UseChatConversationSidebarOptions } from '../useChatConversationSidebar';
import { useChatConversationSidebar } from '../useChatConversationSidebar';

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock('@openthrottle/react-router-shadcn', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: toastMock,
}));

const conversation: AgentConversationListItem = {
  id: 'c1',
  status: 'active',
  title: 'Existing title',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const buildOptions = (
  overrides: Partial<UseChatConversationSidebarOptions> = {},
): UseChatConversationSidebarOptions => ({
  onDelete: vi.fn(),
  onRename: vi.fn(),
  onRestore: vi.fn(),
  ...overrides,
});

/** The `{ action: { onClick } }` options object passed to the last toast call. */
const lastToastUndo = (): (() => void) => {
  const options: unknown = toastMock.mock.lastCall?.[1];
  if (
    typeof options === 'object' &&
    options !== null &&
    'action' in options &&
    typeof options.action === 'object' &&
    options.action !== null &&
    'onClick' in options.action &&
    typeof options.action.onClick === 'function'
  ) {
    const { onClick } = options.action;
    return () => onClick();
  }
  throw new Error('toast was not called with an action');
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
  beforeEach(() => {
    toastMock.mockClear();
  });

  test('starts with no editing and no draft', () => {
    const { result } = renderHook(() =>
      useChatConversationSidebar(buildOptions()),
    );
    expect(result.current.editingId).toBeNull();
    expect(result.current.draftTitle).toBe('');
  });

  describe('startRename', () => {
    test('seeds the draft from the conversation title', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions()),
      );
      act(() => {
        result.current.startRename(conversation);
      });
      expect(result.current.editingId).toBe('c1');
      expect(result.current.draftTitle).toBe('Existing title');
    });

    test('falls back to an empty draft for a null title', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions()),
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
        useChatConversationSidebar(buildOptions()),
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
        useChatConversationSidebar(buildOptions()),
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
        useChatConversationSidebar(buildOptions({ onRename })),
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
        useChatConversationSidebar(buildOptions({ onRename })),
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
        useChatConversationSidebar(buildOptions({ onRename })),
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
        useChatConversationSidebar(buildOptions({ onRename })),
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

  describe('deleteWithUndo', () => {
    test('deletes immediately, without a confirm step', () => {
      const onDelete = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions({ onDelete })),
      );
      act(() => {
        result.current.deleteWithUndo(conversation);
      });
      expect(onDelete).toHaveBeenCalledWith('c1');
    });

    test('shows a 5-second toast naming the conversation', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions()),
      );
      act(() => {
        result.current.deleteWithUndo(conversation);
      });
      expect(toastMock).toHaveBeenCalledWith(
        CHAT_CONVERSATION_SIDEBAR_COPY.deletedToast,
        expect.objectContaining({
          action: expect.objectContaining({
            label: CHAT_CONVERSATION_SIDEBAR_COPY.deletedUndo,
          }),
          description: 'Existing title',
          duration: CHAT_CONVERSATION_UNDO_TOAST_DURATION_MS,
        }),
      );
      expect(CHAT_CONVERSATION_UNDO_TOAST_DURATION_MS).toBe(5000);
    });

    test('falls back to the untitled label for an untitled conversation', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions()),
      );
      act(() => {
        result.current.deleteWithUndo({ ...conversation, title: null });
      });
      expect(toastMock).toHaveBeenCalledWith(
        CHAT_CONVERSATION_SIDEBAR_COPY.deletedToast,
        expect.objectContaining({
          description: CHAT_CONVERSATION_SIDEBAR_COPY.untitled,
        }),
      );
    });

    test('Undo restores the deleted conversation', () => {
      const onRestore = vi.fn();
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions({ onRestore })),
      );
      act(() => {
        result.current.deleteWithUndo(conversation);
      });
      expect(onRestore).not.toHaveBeenCalled();

      lastToastUndo()();

      expect(onRestore).toHaveBeenCalledWith(conversation);
    });

    test('abandons an in-flight rename of the deleted conversation', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions()),
      );
      act(() => {
        result.current.startRename(conversation);
      });
      act(() => {
        result.current.deleteWithUndo(conversation);
      });
      expect(result.current.editingId).toBeNull();
    });

    test('leaves a rename of a different conversation alone', () => {
      const { result } = renderHook(() =>
        useChatConversationSidebar(buildOptions()),
      );
      act(() => {
        result.current.startRename({ ...conversation, id: 'c2' });
      });
      act(() => {
        result.current.deleteWithUndo(conversation);
      });
      expect(result.current.editingId).toBe('c2');
    });
  });
});
