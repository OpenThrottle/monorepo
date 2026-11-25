import { describe, expect, test } from 'vitest';

import {
  CHAT_DRAFTS_STATE_VERSION,
  DEFAULT_CHAT_DRAFTS_STATE,
} from '../../data/chat-drafts-state';
import { normalizeChatDraftsState } from '../normalizeChatDraftsState';

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
