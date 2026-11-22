import type { ChatDraftsState } from '../data/data.chat-drafts-state';
import { CHAT_DRAFTS_STATE_VERSION } from '../data/data.chat-drafts-state';

/**
 * @description The stored draft for `key`, or `''` when there is none.
 * @public
 */
export const readChatDraft = (state: ChatDraftsState, key: string): string => {
  return state.drafts[key] ?? '';
};

/**
 * @description Returns `state` with `key` set to `text`. An empty `text`
 * removes the entry, and an unchanged value returns `state` itself so the atom
 * skips a redundant storage write.
 * @public
 */
export const writeChatDraft = (
  state: ChatDraftsState,
  key: string,
  text: string,
): ChatDraftsState => {
  if (readChatDraft(state, key) === text) {
    return state;
  }

  const drafts: Record<string, string> = { ...state.drafts };
  if (text === '') {
    delete drafts[key];
  } else {
    drafts[key] = text;
  }

  return { drafts, version: CHAT_DRAFTS_STATE_VERSION };
};
