import { describe, expect, test } from 'vitest';

import type {
  AgentConversationGroup,
  AgentConversationListItem,
} from '../../types';
import {
  buildConversationSections,
  conversationDateKey,
} from '../conversation-sections';

const NOW = new Date(2026, 10, 25, 15, 0, 0);

const at = (daysAgo: number, hour = 12): string => {
  return new Date(2026, 10, 25 - daysAgo, hour, 0, 0).toISOString();
};

const conversation = (
  id: string,
  overrides: Partial<AgentConversationListItem> = {},
): AgentConversationListItem => {
  return {
    groupId: null,
    id,
    pinned: false,
    status: 'active',
    title: id,
    updatedAt: at(0),
    ...overrides,
  };
};

const GROUPS: readonly AgentConversationGroup[] = [
  { id: 'g2', name: 'Second', sortOrder: 2000 },
  { id: 'g1', name: 'First', sortOrder: 1000 },
];

describe('conversationDateKey', () => {
  test('earlier today is Today', () => {
    expect(
      conversationDateKey(conversation('a', { updatedAt: at(0, 1) }), NOW),
    ).toBe('today');
  });

  test('yesterday through six days ago is Previous 7 days', () => {
    expect(
      conversationDateKey(conversation('a', { updatedAt: at(1) }), NOW),
    ).toBe('previous-week');
    expect(
      conversationDateKey(conversation('a', { updatedAt: at(6, 1) }), NOW),
    ).toBe('previous-week');
  });

  test('seven or more days ago is Older', () => {
    expect(
      conversationDateKey(conversation('a', { updatedAt: at(7, 23) }), NOW),
    ).toBe('older');
  });

  test('an unparseable timestamp is Older', () => {
    expect(
      conversationDateKey(conversation('a', { updatedAt: 'not a date' }), NOW),
    ).toBe('older');
  });
});

describe('buildConversationSections', () => {
  test('orders Pinned, groups by sortOrder, then the date sections', () => {
    const sections = buildConversationSections(
      [
        conversation('old', { updatedAt: at(30) }),
        conversation('pinned', { pinned: true }),
        conversation('grouped', { groupId: 'g2' }),
        conversation('today'),
      ],
      GROUPS,
      NOW,
    );

    expect(
      sections.map((section) => {
        return section.kind === 'group' ? section.group.id : section.key;
      }),
    ).toEqual(['pinned', 'g1', 'g2', 'today', 'older']);
  });

  test('keeps empty groups and drops empty date sections', () => {
    const sections = buildConversationSections([], GROUPS, NOW);

    expect(sections).toHaveLength(2);
    expect(sections.every((section) => section.kind === 'group')).toBe(true);
  });

  test('a pinned conversation shows under Pinned only, even when grouped', () => {
    const sections = buildConversationSections(
      [conversation('both', { groupId: 'g1', pinned: true })],
      GROUPS,
      NOW,
    );
    const ids = sections.flatMap((section) =>
      section.conversations.map((row) => row.id),
    );

    expect(ids).toEqual(['both']);
    expect(sections[0]).toMatchObject({ key: 'pinned', kind: 'date' });
  });

  test('a conversation in an unknown group falls back to its date', () => {
    const sections = buildConversationSections(
      [conversation('orphan', { groupId: 'missing' })],
      [],
      NOW,
    );

    expect(sections).toEqual([
      {
        conversations: [conversation('orphan', { groupId: 'missing' })],
        key: 'today',
        kind: 'date',
      },
    ]);
  });
});
