import { isRecord, isStringArray } from '@openthrottle/nodejs-utils';

/** What the docked conversations column remembers across a refresh. */
export interface ChatDockState {
  /** Conversation groups shown collapsed. */
  readonly collapsedGroupIds: readonly string[];
  /** Whether the column is docked open (false: collapsed out of the way). */
  readonly isOpen: boolean;
}

const COOKIE_NAME = 'ot_chat_dock';

/** @description Open, with no group collapsed: the dock's state before any cookie. */
export const defaultChatDockState = (): ChatDockState => {
  return { collapsedGroupIds: [], isOpen: true };
};

/**
 * @description Reads the dock state from a `Cookie` request header, so the
 * server render already matches the last session (no flash after refresh).
 * A missing or malformed cookie yields {@link defaultChatDockState}.
 */
export const parseChatDockCookie = (cookieHeader: string): ChatDockState => {
  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (entry == null) {
    return defaultChatDockState();
  }

  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)),
    );
    if (!isRecord(parsed)) {
      return defaultChatDockState();
    }
    const { collapsedGroupIds, isOpen } = parsed;

    return {
      collapsedGroupIds: isStringArray(collapsedGroupIds)
        ? collapsedGroupIds
        : [],
      isOpen: typeof isOpen === 'boolean' ? isOpen : true,
    };
  } catch {
    return defaultChatDockState();
  }
};

/** @description A `document.cookie` assignment that persists the dock state for a year. */
export const serializeChatDockCookie = (state: ChatDockState): string => {
  const ONE_YEAR_SECONDS = 31_536_000;
  const value = encodeURIComponent(
    JSON.stringify({
      collapsedGroupIds: state.collapsedGroupIds,
      isOpen: state.isOpen,
    }),
  );

  return `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
};
