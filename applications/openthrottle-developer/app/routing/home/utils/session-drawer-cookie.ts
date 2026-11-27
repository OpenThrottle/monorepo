import { isRecord, isStringArray } from '@openthrottle/nodejs-utils';

import {
  readJsonCookie,
  serializeJsonCookie,
} from '~/global/utils/json-cookie';

/** What the home route's session drawer remembers across a refresh. */
export interface SessionDrawerState {
  /** Ids of the sections shown collapsed. */
  readonly collapsedSections: readonly string[];
  /** Whether the drawer is open beside the thread (md and up). */
  readonly isOpen: boolean;
}

const COOKIE_NAME = 'ot_chat_session_drawer';

/**
 * @description Closed, with no section collapsed: the drawer's state before
 * any cookie. It opens only once the user asks for it (⌘⇧J or its button).
 */
export const defaultSessionDrawerState = (): SessionDrawerState => {
  return { collapsedSections: [], isOpen: false };
};

/**
 * @description Reads the drawer state from a `Cookie` header (a request's, or
 * `document.cookie`), so the server render already matches the last session.
 * A missing or malformed cookie yields {@link defaultSessionDrawerState}.
 */
export const parseSessionDrawerCookie = (
  cookieHeader: string,
): SessionDrawerState => {
  const parsed = readJsonCookie(cookieHeader, COOKIE_NAME);
  if (!isRecord(parsed)) {
    return defaultSessionDrawerState();
  }
  const { collapsedSections, isOpen } = parsed;

  return {
    collapsedSections: isStringArray(collapsedSections)
      ? collapsedSections
      : [],
    isOpen: typeof isOpen === 'boolean' ? isOpen : false,
  };
};

/** @description A `document.cookie` assignment that persists the drawer state for a year. */
export const serializeSessionDrawerCookie = (
  state: SessionDrawerState,
): string => {
  return serializeJsonCookie(COOKIE_NAME, {
    collapsedSections: state.collapsedSections,
    isOpen: state.isOpen,
  });
};
