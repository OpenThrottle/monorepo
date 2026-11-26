import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { ConversationListContext } from '~/global/config/ConversationListContext';
import { parseChatDockCookie } from '~/global/utils/chat-dock-cookie';

import type { UseConversationDockResult } from '../useConversationDock';
import { useConversationDock } from '../useConversationDock';

const renderDockHook = (
  path: string,
): { readonly latest: { current: UseConversationDockResult | null } } => {
  const latest: { current: UseConversationDockResult | null } = {
    current: null,
  };
  const Harness = (): null => {
    latest.current = useConversationDock({
      enabled: false,
      initialState: { collapsedGroupIds: ['g1'], isOpen: true },
    });
    return null;
  };
  const Stub = createRoutesStub([{ Component: Harness, path: '*' }]);
  render(<Stub initialEntries={[path]} />);

  return { latest };
};

describe('useConversationDock', () => {
  afterEach(() => {
    document.cookie = 'ot_chat_dock=; path=/; max-age=0';
  });

  test('starts from the cookie state and passes collapsed groups on', () => {
    const { latest } = renderDockHook('/plans');

    expect(latest.current?.isOpen).toBe(true);
    expect(latest.current?.grouping.collapsedGroupIds).toEqual(['g1']);
  });

  test('toggling a group persists the new collapsed set', async () => {
    const { latest } = renderDockHook('/plans');

    act(() => {
      latest.current?.grouping.onToggleGroupCollapsed('g1');
      latest.current?.grouping.onToggleGroupCollapsed('g2');
    });

    await waitFor(() => {
      expect(parseChatDockCookie(document.cookie).collapsedGroupIds).toEqual([
        'g2',
      ]);
    });
  });

  describe('activeConversationId', () => {
    test('is the chat route’s conversationId', () => {
      const { latest } = renderDockHook('/?conversationId=c9');

      expect(latest.current?.activeConversationId).toBe('c9');
    });

    test('prefers the id the chat route published over the search param', () => {
      const latest: { current: UseConversationDockResult | null } = {
        current: null,
      };
      const contextValue = {
        activeConversationId: 'c-new',
        list: {
          conversations: [],
          errorMessage: null,
          insert: () => undefined,
          isLoading: false,
          isLoadingMore: false,
          loadMore: () => undefined,
          mapConversations: () => undefined,
          refresh: () => undefined,
          remove: () => undefined,
          rename: () => undefined,
          restore: () => undefined,
          totalCount: 0,
        },
        setActiveConversationId: () => undefined,
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local harness component
      const Harness = (): null => {
        latest.current = useConversationDock({
          enabled: false,
          initialState: { collapsedGroupIds: [], isOpen: true },
        });
        return null;
      };
      const Stub = createRoutesStub([
        {
          // eslint-disable-next-line react/no-multi-comp -- test-local harness component
          Component: () => (
            <ConversationListContext.Provider value={contextValue}>
              <Harness />
            </ConversationListContext.Provider>
          ),
          path: '*',
        },
      ]);
      render(<Stub initialEntries={['/']} />);

      expect(latest.current?.activeConversationId).toBe('c-new');
    });

    test('is null on other routes', () => {
      const { latest } = renderDockHook('/plans?conversationId=c9');

      expect(latest.current?.activeConversationId).toBeNull();
    });
  });
});
