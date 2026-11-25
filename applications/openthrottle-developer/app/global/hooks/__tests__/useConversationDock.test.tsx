import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

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

    test('is null on other routes', () => {
      const { latest } = renderDockHook('/plans?conversationId=c9');

      expect(latest.current?.activeConversationId).toBeNull();
    });
  });
});
