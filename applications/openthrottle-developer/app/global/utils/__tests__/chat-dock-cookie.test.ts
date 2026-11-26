import { describe, expect, test } from 'vitest';

import {
  defaultChatDockState,
  parseChatDockCookie,
  serializeChatDockCookie,
} from '../chat-dock-cookie';

describe('parseChatDockCookie', () => {
  test('reads back what serializeChatDockCookie wrote', () => {
    const state = { collapsedGroupIds: ['g1', 'g2'], isOpen: false };
    const assignment = serializeChatDockCookie(state);
    const pair = assignment.split(';')[0] ?? '';

    expect(parseChatDockCookie(`theme=dark; ${pair}; other=1`)).toEqual(state);
  });

  test('a saved open state wins over the closed default', () => {
    const pair = serializeChatDockCookie({
      collapsedGroupIds: [],
      isOpen: true,
    }).split(';')[0];

    expect(parseChatDockCookie(pair ?? '').isOpen).toBe(true);
  });

  describe('falls back to the default', () => {
    test('which is collapsed to the rail', () => {
      expect(defaultChatDockState()).toEqual({
        collapsedGroupIds: [],
        isOpen: false,
      });
    });

    test('when the cookie is missing', () => {
      expect(parseChatDockCookie('theme=dark')).toEqual(defaultChatDockState());
    });

    test('when the value is not JSON', () => {
      expect(parseChatDockCookie('ot_chat_dock=%7Bnope')).toEqual(
        defaultChatDockState(),
      );
    });

    test('field by field when a field has the wrong type', () => {
      const value = encodeURIComponent(
        JSON.stringify({ collapsedGroupIds: 'g1', isOpen: 'yes' }),
      );

      expect(parseChatDockCookie(`ot_chat_dock=${value}`)).toEqual({
        collapsedGroupIds: [],
        isOpen: false,
      });
    });
  });
});

describe('serializeChatDockCookie', () => {
  test('persists site-wide for a year', () => {
    const assignment = serializeChatDockCookie(defaultChatDockState());

    expect(assignment).toContain('path=/');
    expect(assignment).toContain('max-age=31536000');
  });
});
