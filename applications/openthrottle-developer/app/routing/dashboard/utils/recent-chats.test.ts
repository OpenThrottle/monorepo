import { describe, expect, test } from 'vitest';
import type { AgentConversationListItem } from '@openthrottle/react-router-chat';
import { RECENT_CHATS_CARD_COPY } from '~/routing/dashboard/data/data.copy';
import { conversationHref, conversationLabel } from './recent-chats';

const conversation = (
  overrides: Partial<AgentConversationListItem>,
): AgentConversationListItem => ({
  id: 'convo-1',
  status: 'active',
  title: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('conversationHref', () => {
  test('builds a deep link with the conversationId query param', () => {
    expect(conversationHref('abc-123')).toBe('/?conversationId=abc-123');
  });

  test('URL-encodes special characters in the id', () => {
    expect(conversationHref('a b/c')).toBe('/?conversationId=a%20b%2Fc');
  });
});

describe('conversationLabel', () => {
  test('returns the title when it is a non-blank string', () => {
    expect(conversationLabel(conversation({ title: 'Fix the bug' }))).toBe(
      'Fix the bug',
    );
  });

  test('falls back to the untitled copy when title is null', () => {
    expect(conversationLabel(conversation({ title: null }))).toBe(
      RECENT_CHATS_CARD_COPY.untitled,
    );
  });

  test('falls back to the untitled copy when title is blank', () => {
    expect(conversationLabel(conversation({ title: '   ' }))).toBe(
      RECENT_CHATS_CARD_COPY.untitled,
    );
  });
});
