import {
  toast,
  Toaster,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';

import type { HomeConversationToolbarProps } from '../HomeConversationToolbar';
import { HomeConversationToolbar } from '../HomeConversationToolbar';

const buildConversationList = (): UseConversationListResult => {
  return {
    conversations: [],
    errorMessage: null,
    insert: vi.fn(),
    isLoading: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    mapConversations: vi.fn(),
    refresh: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    restore: vi.fn(),
    totalCount: 0,
  };
};

const renderToolbar = (props: HomeConversationToolbarProps): RenderResult => {
  const Component = (): React.ReactElement => {
    return (
      <TooltipProvider>
        <HomeConversationToolbar {...props} />
        <Toaster />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('HomeConversationToolbar Component', () => {
  let component: RenderResult;
  let props: HomeConversationToolbarProps;

  beforeEach(() => {
    props = {
      activeConversationId: null,
      conversationList: buildConversationList(),
      onNewChat: vi.fn(),
      onSelectConversation: vi.fn(),
    };

    component = renderToolbar(props);
  });

  test('renders the conversation-sheet strip', () => {
    expect(
      component.getByTestId('home-conversation-toolbar'),
    ).toBeInTheDocument();
  });

  test('renders the sheet trigger', () => {
    expect(component.getByRole('button')).toBeInTheDocument();
  });

  describe('when the list failed to load', () => {
    test('shows the failure instead of the empty state, and opening the sheet retries', async () => {
      const conversationList: UseConversationListResult = {
        ...buildConversationList(),
        errorMessage: 'Missing permission: settings:read',
      };
      component.unmount();
      component = renderToolbar({ ...props, conversationList });

      await userEvent.setup().click(component.getByRole('button'));

      expect(conversationList.refresh).toHaveBeenCalledTimes(1);
      expect(component.getByRole('alert')).toHaveTextContent(
        'Missing permission: settings:read',
      );
      expect(
        component.queryByTestId('ChatConversationSidebar-empty'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when a conversation is deleted', () => {
    afterEach(() => {
      // Sonner's store is module-global; clear it between tests.
      toast.dismiss();
    });

    test('shows an Undo toast whose action restores it', async () => {
      const row = {
        groupId: null,
        id: 'conv-1',
        pinned: false,
        status: 'active',
        title: 'Refactor the auth guard',
        updatedAt: '2026-07-29T12:00:00.000Z',
      };
      const conversationList: UseConversationListResult = {
        ...buildConversationList(),
        conversations: [row],
        totalCount: 1,
      };
      component.unmount();
      component = renderToolbar({ ...props, conversationList });
      // The open sheet is a modal dialog, so Radix sets `pointer-events: none` on
      // the body; Sonner's CSS (absent in jsdom) re-enables it on the toast.
      const user = userEvent.setup({
        pointerEventsCheck: PointerEventsCheckLevel.Never,
      });

      await user.click(component.getByRole('button'));
      await user.click(
        await component.findByTestId('ChatConversationSidebar-more-conv-1'),
      );
      await user.click(
        await component.findByTestId('ChatConversationSidebar-delete-conv-1'),
      );

      expect(conversationList.remove).toHaveBeenCalledWith('conv-1');

      await user.click(await component.findByRole('button', { name: 'Undo' }));

      expect(conversationList.restore).toHaveBeenCalledWith(row);
    });
  });
});
