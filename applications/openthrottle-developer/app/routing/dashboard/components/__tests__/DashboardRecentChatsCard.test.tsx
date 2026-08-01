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

  test('caps the list at three rows', () => {
    const many: readonly AgentConversationListItem[] = [
      ...CONVERSATIONS,
      {
        id: 'c4',
        status: 'active',
        title: 'Fourth chat',
        updatedAt: '2026-07-29T00:00:00.000Z',
      },
    ];
    const component = renderCard(many);

    expect(component.queryByText('Fourth chat')).not.toBeInTheDocument();
  });

  test('falls back to the untitled label when a title is null', () => {
    const component = renderCard(CONVERSATIONS);

    expect(
      component.getByText(RECENT_CHATS_CARD_COPY.untitled),
    ).toBeInTheDocument();
  });

  test('deep-links each row to its conversation', () => {
    const component = renderCard(CONVERSATIONS);

    expect(component.getByText('First chat').closest('a')).toHaveAttribute(
      'href',
      '/?conversationId=c1',
    );
    expect(component.getByText('Second chat').closest('a')).toHaveAttribute(
      'href',
      '/?conversationId=c2',
    );
    expect(
      component.getByText(RECENT_CHATS_CARD_COPY.untitled).closest('a'),
    ).toHaveAttribute('href', '/?conversationId=c3');
  });

  test('renders the empty-state when there are no conversations', () => {
    const component = renderCard([]);

    expect(
      component.getByText(RECENT_CHATS_CARD_COPY.empty),
    ).toBeInTheDocument();
    expect(component.queryByText('First chat')).not.toBeInTheDocument();
  });

  test('renders footer quick links with the expected hrefs', () => {
    const component = renderCard(CONVERSATIONS);

    const hrefFor = (label: string): string | null =>
      component.getByRole('link', { name: label }).getAttribute('href');

    expect(hrefFor(RECENT_CHATS_CARD_COPY.viewAll)).toBe('/');
    expect(hrefFor(RECENT_CHATS_CARD_COPY.newChat)).toBe('/');
    expect(hrefFor('Plans')).toBe('/plans');
    expect(hrefFor('Pull requests')).toBe('/pull-requests');
    expect(hrefFor('Queues')).toBe('/queues');
  });

  test('keeps the footer links available in the empty-state', () => {
    const component = renderCard([]);

    expect(
      component.getByRole('link', { name: RECENT_CHATS_CARD_COPY.newChat }),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Plans' })).toBeInTheDocument();
  });
});
