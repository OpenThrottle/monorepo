/** Base path for all mail routes. Use for links and active-state checks. */
const MAIL_BASE_PATH = '/mail';

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
