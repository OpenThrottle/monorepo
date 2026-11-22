import { APP_NAME } from '@openthrottle/react-router-utils';

/**
 * Schema version stamped into the persisted drafts blob. Bump it when
 * {@link ChatDraftsState} changes shape and teach `normalizeChatDraftsState`
 * to migrate the old blob.
 * @public
 */
export const CHAT_DRAFTS_STATE_VERSION = 1 as const;

/**
 * localStorage key for the persisted composer drafts, namespaced per consuming
 * app at runtime through `APP_NAME` (same scheme as the toolbar atom).
 * @public
 */
export const CHAT_DRAFTS_STORAGE_KEY = `${APP_NAME}:chat:drafts`;

/**
 * Draft key for a composer that has no conversation yet (a new chat). Real
 * conversation ids are UUIDs, so this sentinel can never collide with one.
 * @public
 */
export const CHAT_DRAFT_NEW_CONVERSATION_KEY = '__new__';

/**
 * Typing pause, in milliseconds, before a draft is written to storage.
 * @public
 */
export const CHAT_DRAFT_WRITE_DELAY_MS = 300;

/**
 * Persisted composer drafts, keyed by conversation id (or
 * {@link CHAT_DRAFT_NEW_CONVERSATION_KEY}). Empty drafts are never stored, so
 * the map only holds conversations with unsent text.
 * @public
 */
export interface ChatDraftsState {
  readonly drafts: Readonly<Record<string, string>>;
  readonly version: typeof CHAT_DRAFTS_STATE_VERSION;
}

/**
 * Empty drafts map at the current schema version.
 * @public
 */
export const DEFAULT_CHAT_DRAFTS_STATE: ChatDraftsState = {
  drafts: {},
  version: CHAT_DRAFTS_STATE_VERSION,
};
