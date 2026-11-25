import { describe, expect, test } from 'vitest';

import { DEFAULT_CHAT_DRAFTS_STATE } from '../../data/chat-drafts-state';
import { readChatDraft, writeChatDraft } from '../chat-drafts';

describe('writeChatDraft', () => {
  test('sets a draft', () => {
    const state = writeChatDraft(DEFAULT_CHAT_DRAFTS_STATE, 'a', 'one');

    expect(readChatDraft(state, 'a')).toBe('one');
  });

  test('keeps drafts for other conversations isolated', () => {
    const first = writeChatDraft(DEFAULT_CHAT_DRAFTS_STATE, 'a', 'one');
    const second = writeChatDraft(first, 'b', 'two');

    expect(second.drafts).toEqual({ a: 'one', b: 'two' });
  });

  test('removes the entry for an empty draft', () => {
    const seeded = writeChatDraft(DEFAULT_CHAT_DRAFTS_STATE, 'a', 'one');

    expect(writeChatDraft(seeded, 'a', '').drafts).toEqual({});
  });

  test('returns the same state when nothing changed', () => {
    const seeded = writeChatDraft(DEFAULT_CHAT_DRAFTS_STATE, 'a', 'one');

    expect(writeChatDraft(seeded, 'a', 'one')).toBe(seeded);
  });
});

describe('readChatDraft', () => {
  test('returns an empty string for an unknown key', () => {
    expect(readChatDraft(DEFAULT_CHAT_DRAFTS_STATE, 'missing')).toBe('');
  });
});
