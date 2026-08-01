import type { MailFolderId } from '~/types/mail';
import { MAIL_FOLDER_IDS } from '~/types/mail';

/**
 * @description Single-sourced user-facing copy for the inbox components.
 * Hoisted out of the components per component-primitive-shape R4
 * (copy → data/data.copy.ts).
 */

/** Empty-state copy per folder for {@link MessageList}. Used when messages.length === 0. */
export const MESSAGE_LIST_EMPTY_COPY: Record<
  MailFolderId,
  { readonly description: string; readonly title: string }
> = {
  [MAIL_FOLDER_IDS.inbox]: {
    description: 'New messages will appear here.',
    title: 'No messages in Inbox',
  },
  [MAIL_FOLDER_IDS.sent]: {
    description: 'Messages you send will appear here.',
    title: 'No sent messages',
  },
  [MAIL_FOLDER_IDS.drafts]: {
    description: 'Drafts you save will appear here.',
    title: 'No drafts',
  },
  [MAIL_FOLDER_IDS.trash]: {
    description: 'Deleted messages will appear here.',
    title: 'Trash is empty',
  },
};
