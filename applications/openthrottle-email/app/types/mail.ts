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
