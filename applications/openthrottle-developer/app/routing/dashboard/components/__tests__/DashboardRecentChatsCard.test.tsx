import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { AgentConversationListItem } from '@openthrottle/react-router-chat';
import { DashboardRecentChatsCard } from '../DashboardRecentChatsCard';
import { RECENT_CHATS_CARD_COPY } from '~/routing/dashboard/data/data.copy';

const CONVERSATIONS: readonly AgentConversationListItem[] = [
  {
    id: 'c1',
    status: 'active',
    title: 'First chat',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'c2',
    status: 'idle',
    title: 'Second chat',
    updatedAt: '2026-07-31T00:00:00.000Z',
  },
  {
    id: 'c3',
    status: 'active',
    title: null,
    updatedAt: '2026-07-30T00:00:00.000Z',
  },
];

const renderCard = (conversations: readonly AgentConversationListItem[]) => {
  const Component = () => (
    <DashboardRecentChatsCard conversations={conversations} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('DashboardRecentChatsCard Component', () => {
  test('renders a row per conversation', () => {
    const component = renderCard(CONVERSATIONS);

    expect(
      component.getByTestId('DashboardRecentChatsCard'),
    ).toBeInTheDocument();
    expect(component.getByText('First chat')).toBeInTheDocument();
    expect(component.getByText('Second chat')).toBeInTheDocument();
  });

  test('falls back to the untitled label when a title is null', () => {
    const component = renderCard(CONVERSATIONS);

    expect(
      component.getByText(RECENT_CHATS_CARD_COPY.untitled),
    ).toBeInTheDocument();
  });

  test('links each row to its conversation deep-link', () => {
    const component = renderCard(CONVERSATIONS);

    expect(component.getByText('First chat').closest('a')).toHaveAttribute(
      'href',
      '/?conversationId=c1',
    );
  });

  test('renders the empty-state when there are no conversations', () => {
    const component = renderCard([]);

    expect(
      component.getByText(RECENT_CHATS_CARD_COPY.empty),
    ).toBeInTheDocument();
    expect(component.queryByText('First chat')).not.toBeInTheDocument();
  });
});
