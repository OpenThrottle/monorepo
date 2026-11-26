import { describe, expect, test } from 'vitest';

import {
  conversationDragId,
  dateSectionId,
  groupSectionId,
  parseConversationDragId,
  resolveConversationDrop,
} from '../conversation-drag';

const loose = { groupId: null, pinned: false };
const pinned = { groupId: null, pinned: true };
const grouped = { groupId: 'g1', pinned: false };

describe('conversation drag ids', () => {
  test('round-trips a conversation id', () => {
    expect(parseConversationDragId(conversationDragId('abc'))).toBe('abc');
  });

  test('rejects a non-conversation id', () => {
    expect(parseConversationDragId(groupSectionId('g1'))).toBeNull();
  });
});

describe('resolveConversationDrop', () => {
  describe('when there is no usable target', () => {
    test('returns null for no target', () => {
      expect(resolveConversationDrop(loose, null)).toBeNull();
    });

    test('returns null for a non-section id', () => {
      expect(resolveConversationDrop(loose, 'conversation:x')).toBeNull();
    });
  });

  describe('when dropped on Pinned', () => {
    test('pins a loose row', () => {
      expect(resolveConversationDrop(loose, dateSectionId('pinned'))).toEqual({
        kind: 'pin',
      });
    });

    test('pins a grouped row', () => {
      expect(resolveConversationDrop(grouped, dateSectionId('pinned'))).toEqual(
        { kind: 'pin' },
      );
    });

    test('does nothing for an already pinned row', () => {
      expect(
        resolveConversationDrop(pinned, dateSectionId('pinned')),
      ).toBeNull();
    });
  });

  describe('when dropped on a group', () => {
    test('moves a loose row into it', () => {
      expect(resolveConversationDrop(loose, groupSectionId('g2'))).toEqual({
        groupId: 'g2',
        kind: 'move-to-group',
      });
    });

    test('moves a pinned row into its own group id', () => {
      expect(
        resolveConversationDrop(
          { groupId: 'g1', pinned: true },
          groupSectionId('g1'),
        ),
      ).toEqual({ groupId: 'g1', kind: 'move-to-group' });
    });

    test('does nothing for a row already in it', () => {
      expect(resolveConversationDrop(grouped, groupSectionId('g1'))).toBeNull();
    });
  });

  describe('when dropped on a date section', () => {
    test('ungroups a grouped row', () => {
      expect(resolveConversationDrop(grouped, dateSectionId('today'))).toEqual({
        kind: 'ungroup',
      });
    });

    test('ungroups a pinned row', () => {
      expect(resolveConversationDrop(pinned, dateSectionId('older'))).toEqual({
        kind: 'ungroup',
      });
    });

    test('does nothing for a loose row', () => {
      expect(resolveConversationDrop(loose, dateSectionId('today'))).toBeNull();
    });
  });
});
