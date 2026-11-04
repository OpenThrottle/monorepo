import { describe, expect, test } from 'vitest';

import {
  CHAT_DRAFTS_STATE_VERSION,
  DEFAULT_CHAT_DRAFTS_STATE,
  normalizeChatDraftsState,
  readChatDraft,
  writeChatDraft,
} from '../atom.chat-drafts';

describe('normalizeChatDraftsState', () => {
  test('keeps non-empty string drafts', () => {
    const state = normalizeChatDraftsState({
      drafts: { a: 'one', b: '', c: 3 },
      version: CHAT_DRAFTS_STATE_VERSION,
    });

    expect(state.drafts).toEqual({ a: 'one' });
  });

  test('falls back to the default for malformed input', () => {
    expect(normalizeChatDraftsState(null)).toBe(DEFAULT_CHAT_DRAFTS_STATE);
    expect(normalizeChatDraftsState('nope')).toBe(DEFAULT_CHAT_DRAFTS_STATE);
    expect(
      normalizeChatDraftsState({
        drafts: 'nope',
        version: CHAT_DRAFTS_STATE_VERSION,
      }),
    ).toBe(DEFAULT_CHAT_DRAFTS_STATE);
  });

  test('falls back to the default for an unknown version', () => {
    expect(
      normalizeChatDraftsState({ drafts: { a: 'one' }, version: 99 }),
    ).toBe(DEFAULT_CHAT_DRAFTS_STATE);
  });
});

describe('writeChatDraft', () => {
  test('sets a draft', () => {
    const state = writeChatDraft(DEFAULT_CHAT_DRAFTS_STATE, 'a', 'one');

    expect(readChatDraft(state, 'a')).toBe('one');
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
