import { isRecord } from '@openthrottle/nodejs-utils';

import type { ChatDraftsState } from '../data/chat-drafts-state';
import {
  CHAT_DRAFTS_STATE_VERSION,
  DEFAULT_CHAT_DRAFTS_STATE,
} from '../data/chat-drafts-state';

/**
 * @description Coerce unknown persisted JSON into a valid
 * {@link ChatDraftsState}. Non-string and empty drafts are dropped; a newer or
 * unknown version, or malformed input, falls back to
 * `DEFAULT_CHAT_DRAFTS_STATE` instead of throwing.
 * @public
 */
export const normalizeChatDraftsState = (raw: unknown): ChatDraftsState => {
  if (!isRecord(raw) || raw.version !== CHAT_DRAFTS_STATE_VERSION) {
    return DEFAULT_CHAT_DRAFTS_STATE;
  }

  if (!isRecord(raw.drafts)) {
    return DEFAULT_CHAT_DRAFTS_STATE;
  }

  const drafts: Record<string, string> = {};
  for (const [key, text] of Object.entries(raw.drafts)) {
    if (typeof text === 'string' && text !== '') {
      drafts[key] = text;
    }
  }

  return { drafts, version: CHAT_DRAFTS_STATE_VERSION };
};
