/**
 * @description Shared types for mail list/detail views. Used by MessageList, MessageDetail, and mock/API data.
 */

/** Folder/label id for inbox, sent, drafts, trash. Used by mock and future API. */
export const MAIL_FOLDER_IDS = {
  drafts: 'drafts',
  inbox: 'inbox',
  sent: 'sent',
  trash: 'trash',
} as const;

export type MailFolderId =
  (typeof MAIL_FOLDER_IDS)[keyof typeof MAIL_FOLDER_IDS];

export interface MailFolder {
  readonly id: MailFolderId;
  readonly label: string;
}

/**
 * Single source of truth for the user-facing folder list (id + label), in display order.
 * Sidebar folders, mock folder metadata, and unread-count maps all derive from this so a
 * folder change happens in exactly one place. Search/Settings/Compose are nav-only (not folders).
 */
export const MAIL_FOLDERS: readonly MailFolder[] = [
  { id: MAIL_FOLDER_IDS.inbox, label: 'Inbox' },
  { id: MAIL_FOLDER_IDS.sent, label: 'Sent' },
  { id: MAIL_FOLDER_IDS.drafts, label: 'Drafts' },
  { id: MAIL_FOLDER_IDS.trash, label: 'Trash' },
];

/** Ordered folder ids derived from {@link MAIL_FOLDERS}. Use for iteration and keyed records. */
export const MAIL_FOLDER_IDS_LIST: readonly MailFolderId[] = MAIL_FOLDERS.map(
  (folder) => folder.id,
);

export interface MailMessageSummary {
  readonly date: string;
  readonly from: string;
  readonly id: string;
  readonly read: boolean;
  readonly subject: string;
}

/** Optional attachment info for reading pane; extend when API provides real data. */
export interface MailAttachment {
  readonly name: string;
}

export interface MailMessageDetail {
  /** Placeholder for attachment list in reading pane; wire to API when available. */
  readonly attachments?: readonly MailAttachment[];
  readonly body: string;
  readonly date: string;
  readonly from: string;
  readonly id: string;
  readonly subject: string;
  readonly to: string;
}
