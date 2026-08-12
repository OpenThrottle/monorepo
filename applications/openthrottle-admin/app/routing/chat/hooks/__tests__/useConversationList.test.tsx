import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type { ListAgentConversationsResult } from '@openthrottle/react-router-chat';
import { useConversationList } from '../useConversationList';
import type { UseConversationListResult } from '../useConversationList';

/** Mounts the hook inside a routes stub and exposes its latest return value. */
const renderList = (
  listResult: ListAgentConversationsResult,
): { captured: { current: UseConversationListResult | null } } => {
  const captured: { current: UseConversationListResult | null } = {
    current: null,
  };
  const listSpy = vi.fn(() => listResult);

  const Harness = () => {
    captured.current = useConversationList();
    return null;
  };

  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    {
      action: listSpy,
      path: '/resources/agent-conversations',
    },
  ]);

  render(<RoutesStub />);

  return { captured };
};

describe('useConversationList', () => {
  test('loads the first page of conversations on mount', async () => {
    const { captured } = renderList({
      conversations: [
        { id: 'c1', status: 'active', title: 'Hello', updatedAt: '2025-01-01' },
      ],
      errorMessage: null,
      totalCount: 1,
    });

    await waitFor(() => {
      expect(captured.current?.conversations).toHaveLength(1);
    });

    expect(captured.current?.conversations[0]?.id).toBe('c1');
    expect(captured.current?.totalCount).toBe(1);
    expect(captured.current?.isLoading).toBe(false);
  });

  test('starts with no conversations while nothing has loaded yet', () => {
    const { captured } = renderList({
      conversations: [],
      errorMessage: null,
      totalCount: 0,
    });

    expect(captured.current?.conversations).toEqual([]);
    expect(typeof captured.current?.loadMore).toBe('function');
    expect(typeof captured.current?.refresh).toBe('function');
  });
});
