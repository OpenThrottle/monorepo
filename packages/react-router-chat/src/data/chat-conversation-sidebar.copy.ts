/**
 * Static copy for {@link ChatConversationSidebar}. Kept out of the component per
 * the repo's component/data split so wording lives in one place.
 * @public
 */
export const CHAT_CONVERSATION_SIDEBAR_COPY = {
  deletedToast: 'Conversation deleted',
  deletedUndo: 'Undo',
  emptyDescription: 'Your saved conversations will appear here.',
  emptyTitle: 'No conversations yet',
  loadMore: 'Load more',
  newChat: 'New chat',
  renamePlaceholder: 'Conversation title',
  switcherDescription:
    'Browse, restore, rename, or delete your saved conversations.',
  title: 'Conversations',
  untitled: 'Untitled conversation',
} as const;

/**
 * How long the post-delete Undo toast stays up. Delete is soft and immediate;
 * this is the window in which a click on Undo restores the conversation.
 * @public
 */
export const CHAT_CONVERSATION_UNDO_TOAST_DURATION_MS = 5000;
