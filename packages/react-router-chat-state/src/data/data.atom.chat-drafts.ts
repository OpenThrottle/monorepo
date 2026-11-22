import { atomWithStorage } from 'jotai/utils';

import { createChatDraftsStorage } from '../utils/createChatDraftsStorage';
import {
  CHAT_DRAFTS_STORAGE_KEY,
  DEFAULT_CHAT_DRAFTS_STATE,
} from './data.chat-drafts-state';

/**
 * Global, localStorage-backed atom holding unsent composer drafts per
 * conversation. Read and written through `useChatDraft`, which debounces the
 * writes. `getOnInit` hydrates synchronously so a saved draft shows on first
 * client paint.
 * @public
 */
export const chatDraftsAtom = atomWithStorage(
  CHAT_DRAFTS_STORAGE_KEY,
  DEFAULT_CHAT_DRAFTS_STATE,
  createChatDraftsStorage(),
  { getOnInit: true },
);
