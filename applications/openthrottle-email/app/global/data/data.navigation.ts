import type { LinkProps } from 'react-router';

/** Base path for all mail routes. Use for links and active-state checks. */
export const MAIL_BASE_PATH = '/mail';

/** Canonical paths for mail areas. Use these for Link `to` and comparisons. */
export const MAIL_PATHS = {
  compose: `${MAIL_BASE_PATH}/compose`,
  drafts: `${MAIL_BASE_PATH}/drafts`,
  inbox: `${MAIL_BASE_PATH}/`,
  search: `${MAIL_BASE_PATH}/search`,
  sent: `${MAIL_BASE_PATH}/sent`,
  trash: `${MAIL_BASE_PATH}/trash`,
} as const;

/** @description Build path for a single message in inbox (e.g. {@link MessageList} row link, back-navigation). */
export function mailInboxMessagePath(id: string): string {
  return `${MAIL_BASE_PATH}/inbox/${id}`;
}

/**
 * @description Navigation links for the mail-area sidebar (Inbox, Sent, Drafts, Trash, Compose, Settings).
 * Used by {@link MailSidebar} and optionally by global header.
 */
export const mailNavigation: LinkProps[] = [
  { children: 'Inbox', to: MAIL_PATHS.inbox },
  { children: 'Sent', to: MAIL_PATHS.sent },
  { children: 'Drafts', to: MAIL_PATHS.drafts },
  { children: 'Trash', to: MAIL_PATHS.trash },
  { children: 'Search', to: MAIL_PATHS.search },
  { children: 'Compose', to: MAIL_PATHS.compose },
  { children: 'Settings', to: '/settings' },
];

/**
 * @description Top-level app navigation (used by {@link GlobalHeader}). Currently mirrors {@link mailNavigation}; see docs/NAVIGATION_STRUCTURE.md for evaluation—recommendation is to limit header to brand + global actions and use sidebar as single primary mail nav.
 */
export const dataNavigation: LinkProps[] = [...mailNavigation];
