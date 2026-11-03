import { isRecord } from '@openthrottle/nodejs-utils';
import { APP_NAME } from '@openthrottle/react-router-utils';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/**
 * Schema version stamped into the persisted drafts blob. Bump it when
 * {@link ChatDraftsState} changes shape and add a migration case to
 * {@link normalizeChatDraftsState}.
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
 * Typing pause, in milliseconds, before a draft is written to storage. Matches
 * T3 Code's composer draft store.
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

/**
 * @description Coerce unknown persisted JSON into a valid
 * {@link ChatDraftsState}. Non-string and empty drafts are dropped; a newer or
 * unknown version, or malformed input, falls back to
 * {@link DEFAULT_CHAT_DRAFTS_STATE} instead of throwing.
 * @public
 */
export function normalizeChatDraftsState(raw: unknown): ChatDraftsState {
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
}

/**
 * @description The stored draft for `key`, or `''` when there is none.
 * @public
 */
export function readChatDraft(state: ChatDraftsState, key: string): string {
  return state.drafts[key] ?? '';
}

/**
 * @description Returns `state` with `key` set to `text`. An empty `text`
 * removes the entry, and an unchanged value returns `state` itself so the atom
 * skips a redundant storage write.
 * @public
 */
export function writeChatDraft(
  state: ChatDraftsState,
  key: string,
  text: string,
): ChatDraftsState {
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
}

/**
 * SSR-guarded JSON storage that normalizes on read: a no-op store on the
 * server, localStorage in the browser. No cross-tab `subscribe`, matching the
 * toolbar atom.
 */
const createChatDraftsStorage = (): SyncStorage<ChatDraftsState> => {
  const jsonStorage = createJSONStorage<ChatDraftsState>(() => {
    if (typeof window === 'undefined') {
      return {
        getItem: () => null,
        removeItem: () => {},
        setItem: () => {},
        subscribe: () => () => {},
      };
    }
    return localStorage;
  });

  return {
    ...jsonStorage,
    getItem: (key, initialValue) => {
      const raw = jsonStorage.getItem(key, initialValue);
      return normalizeChatDraftsState(raw);
    },
  };
};

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
