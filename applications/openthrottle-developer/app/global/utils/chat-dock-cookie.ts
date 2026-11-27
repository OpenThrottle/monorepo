import { isRecord, isStringArray } from '@openthrottle/nodejs-utils';

import { readJsonCookie, serializeJsonCookie } from './json-cookie';

/** What the docked conversations column remembers across a refresh. */
export interface ChatDockState {
  /** Conversation groups shown collapsed. */
  readonly collapsedGroupIds: readonly string[];
  /** Whether the column is docked open (false: collapsed out of the way). */
  readonly isOpen: boolean;
}

const COOKIE_NAME = 'ot_chat_dock';

/**
 * @description Collapsed to its rail, with no group collapsed: the dock's state
 * before any cookie. It opens only once the user asks for it (⌘J or the rail).
 */
export const defaultChatDockState = (): ChatDockState => {
  return { collapsedGroupIds: [], isOpen: false };
};

/**
 * @description Reads the dock state from a `Cookie` request header, so the
 * server render already matches the last session (no flash after refresh).
 * A missing or malformed cookie yields {@link defaultChatDockState}.
 */
export const parseChatDockCookie = (cookieHeader: string): ChatDockState => {
  const parsed = readJsonCookie(cookieHeader, COOKIE_NAME);
  if (!isRecord(parsed)) {
    return defaultChatDockState();
  }
  const { collapsedGroupIds, isOpen } = parsed;

  return {
    collapsedGroupIds: isStringArray(collapsedGroupIds)
      ? collapsedGroupIds
      : [],
    isOpen: typeof isOpen === 'boolean' ? isOpen : false,
  };
};

/** @description A `document.cookie` assignment that persists the dock state for a year. */
export const serializeChatDockCookie = (state: ChatDockState): string => {
  return serializeJsonCookie(COOKIE_NAME, {
    collapsedGroupIds: state.collapsedGroupIds,
    isOpen: state.isOpen,
  });
};
