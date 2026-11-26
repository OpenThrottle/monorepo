import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { UseConversationListContextResult } from '~/global/hooks/useConversationListContext';
import { useConversationListContext } from '~/global/hooks/useConversationListContext';

import { ConversationListProvider } from '../ConversationListProvider';

const CONVERSATION = {
  groupId: null,
  id: 'conv-new',
  pinned: false,
  status: 'active',
  title: 'New chat',
  updatedAt: '2026-11-25T00:00:00.000Z',
};

const renderTwoConsumers = (): {
  readonly first: { current: UseConversationListContextResult | null };
  readonly second: { current: UseConversationListContextResult | null };
} => {
  const first: { current: UseConversationListContextResult | null } = {
    current: null,
  };
  const second: { current: UseConversationListContextResult | null } = {
    current: null,
  };
  const First = (): null => {
    first.current = useConversationListContext({ enabled: false });
    return null;
  };
  // eslint-disable-next-line react/no-multi-comp -- test-local harness component
  const Second = (): null => {
    second.current = useConversationListContext({ enabled: false });
    return null;
  };
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- test-local harness component
      Component: () => (
        <ConversationListProvider enabled={false}>
          <First />
          <Second />
        </ConversationListProvider>
      ),
      path: '/',
    },
  ]);
  render(<Stub />);

  return { first, second };
};

describe('ConversationListProvider', () => {
  test('a row one consumer inserts is listed for every consumer', async () => {
    const { first, second } = renderTwoConsumers();

    act(() => {
      first.current?.list.insert(CONVERSATION);
    });

    await waitFor(() => {
      expect(second.current?.list.conversations.map((row) => row.id)).toEqual([
        'conv-new',
      ]);
    });
  });

  test('the published active conversation reaches every consumer', async () => {
    const { first, second } = renderTwoConsumers();

    act(() => {
      first.current?.setActiveConversationId('conv-new');
    });

    await waitFor(() => {
      expect(second.current?.activeConversationId).toBe('conv-new');
    });
  });
});
