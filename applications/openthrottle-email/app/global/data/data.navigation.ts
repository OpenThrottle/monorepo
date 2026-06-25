import type { LinkProps } from 'react-router';
import type { MailFolderId } from '~/types/mail';
import { MAIL_FOLDERS } from '~/types/mail';

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

/** Maps a folder id to its canonical path in {@link MAIL_PATHS}. */
const MAIL_FOLDER_PATHS: Record<MailFolderId, string> = {
  drafts: MAIL_PATHS.drafts,
  inbox: MAIL_PATHS.inbox,
  sent: MAIL_PATHS.sent,
  trash: MAIL_PATHS.trash,
};

/** Folder nav links derived from the single {@link MAIL_FOLDERS} source so folders are defined once. */
const folderNavigation: LinkProps[] = MAIL_FOLDERS.map((folder) => ({
  children: folder.label,
  to: MAIL_FOLDER_PATHS[folder.id],
}));

/**
 * @description Navigation links for the mail-area sidebar (Inbox, Sent, Drafts, Trash, Compose, Settings).
 * Folder entries derive from {@link MAIL_FOLDERS}; Search, Compose, and Settings are nav-only.
 * Used by {@link MailSidebar} and optionally by global header.
 */
export const mailNavigation: LinkProps[] = [
  ...folderNavigation,
  { children: 'Search', to: MAIL_PATHS.search },
  { children: 'Compose', to: MAIL_PATHS.compose },
  { children: 'Settings', to: '/settings' },
];

/**
 * @description Top-level app navigation (used by {@link GlobalHeader}). Currently mirrors {@link mailNavigation}.
 */
export const dataNavigation: LinkProps[] = [...mailNavigation];
