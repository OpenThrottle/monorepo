import { Toaster } from '@openthrottle/react-router-shadcn';
import type { RenderHookResult } from '@testing-library/react';
import { act, render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../../data/chat-conversation-sidebar.copy';
import type {
  AgentConversationGroup,
  AgentConversationListItem,
} from '../../types';
import type {
  UseChatConversationSidebarOptions,
  UseChatConversationSidebarResult,
} from '../useChatConversationSidebar';
import { useChatConversationSidebar } from '../useChatConversationSidebar';

const conversation: AgentConversationListItem = {
  groupId: null,
  id: 'c1',
  pinned: false,
  status: 'active',
  title: 'Existing title',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const group: AgentConversationGroup = {
  id: 'g1',
  name: 'Launch prep',
  sortOrder: 1000,
};

const renderSidebarHook = (
  overrides: Partial<UseChatConversationSidebarOptions> = {},
): RenderHookResult<UseChatConversationSidebarResult, unknown> => {
  return renderHook(() =>
    useChatConversationSidebar({
      onCreateGroup: vi.fn(),
      onDelete: vi.fn(),
      onRename: vi.fn(),
      onRenameGroup: vi.fn(),
      onRestore: vi.fn(),
      ...overrides,
    }),
  );
};

interface EditHarnessProps {
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/** Minimal input exercising `onEditKeyDown` with real keyboard events. */
const EditHarness = (props: EditHarnessProps): React.ReactElement => {
  return (
    <input
      aria-label="Edit"
      onChange={() => {}}
      onKeyDown={props.onKeyDown}
      value=""
    />
  );
};

describe('useChatConversationSidebar', () => {
  test('starts with nothing being edited', () => {
    const { result } = renderSidebarHook();

    expect(result.current.editing).toBeNull();
    expect(result.current.draft).toBe('');
  });

  describe('startRename', () => {
    test('targets the conversation and seeds the draft from its title', () => {
      const { result } = renderSidebarHook();
      act(() => {
        result.current.startRename(conversation);
      });

      expect(result.current.editing).toEqual({
        id: 'c1',
        kind: 'conversation',
      });
      expect(result.current.draft).toBe('Existing title');
    });

    test('seeds an empty draft for a null title', () => {
      const { result } = renderSidebarHook();
      act(() => {
        result.current.startRename({ ...conversation, title: null });
      });

      expect(result.current.draft).toBe('');
    });
  });

  describe('commitEdit', () => {
    test('saves a trimmed conversation title', () => {
      const onRename = vi.fn();
      const { result } = renderSidebarHook({ onRename });
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraft('  Renamed  ');
      });
      act(() => {
        result.current.commitEdit();
      });

      expect(onRename).toHaveBeenCalledWith('c1', 'Renamed');
      expect(result.current.editing).toBeNull();
    });

    test('saves a group rename', () => {
      const onRenameGroup = vi.fn();
      const { result } = renderSidebarHook({ onRenameGroup });
      act(() => {
        result.current.startGroupRename(group);
        result.current.setDraft('Shipping');
      });
      act(() => {
        result.current.commitEdit();
      });

      expect(onRenameGroup).toHaveBeenCalledWith('g1', 'Shipping');
    });

    test('creates a new group that receives the conversation', () => {
      const onCreateGroup = vi.fn();
      const { result } = renderSidebarHook({ onCreateGroup });
      act(() => {
        result.current.startNewGroup('c1');
        result.current.setDraft('Probes');
      });
      act(() => {
        result.current.commitEdit();
      });

      expect(onCreateGroup).toHaveBeenCalledWith('Probes', 'c1');
    });

    test('an empty draft saves nothing', () => {
      const onRename = vi.fn();
      const { result } = renderSidebarHook({ onRename });
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraft('   ');
      });
      act(() => {
        result.current.commitEdit();
      });

      expect(onRename).not.toHaveBeenCalled();
      expect(result.current.editing).toBeNull();
    });

    test('a second save after the first (Enter, then blur) is a no-op', () => {
      const onRename = vi.fn();
      const { result } = renderSidebarHook({ onRename });
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraft('Renamed');
      });
      act(() => {
        result.current.commitEdit();
        result.current.commitEdit();
      });

      expect(onRename).toHaveBeenCalledTimes(1);
    });
  });

  describe('onEditKeyDown', () => {
    test('Enter saves', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderSidebarHook({ onRename });
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraft('Renamed');
      });
      const component = render(
        <EditHarness onKeyDown={result.current.onEditKeyDown} />,
      );

      await user.type(component.getByLabelText('Edit'), '{Enter}');

      expect(onRename).toHaveBeenCalledWith('c1', 'Renamed');
    });

    test('Escape cancels without saving', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderSidebarHook({ onRename });
      act(() => {
        result.current.startRename(conversation);
        result.current.setDraft('Ignored');
      });
      const component = render(
        <EditHarness onKeyDown={result.current.onEditKeyDown} />,
      );

      await user.type(component.getByLabelText('Edit'), '{Escape}');

      expect(onRename).not.toHaveBeenCalled();
      expect(result.current.editing).toBeNull();
      expect(result.current.draft).toBe('');
    });

    test('other keys are ignored', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      const { result } = renderSidebarHook({ onRename });
      act(() => {
        result.current.startRename(conversation);
      });
      const component = render(
        <EditHarness onKeyDown={result.current.onEditKeyDown} />,
      );

      await user.type(component.getByLabelText('Edit'), 'a');

      expect(onRename).not.toHaveBeenCalled();
      expect(result.current.editing).toEqual({
        id: 'c1',
        kind: 'conversation',
      });
    });
  });

  describe('delete flow', () => {
    test('deletes at once and toasts with an Undo action', async () => {
      const onDelete = vi.fn();
      const onRestore = vi.fn();
      const { result } = renderSidebarHook({ onDelete, onRestore });
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
