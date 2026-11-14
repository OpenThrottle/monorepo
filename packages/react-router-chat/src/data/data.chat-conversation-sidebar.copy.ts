/**
 * Static copy for {@link ChatConversationSidebar}. Kept out of the component per
 * the repo's component/data split so wording lives in one place.
 * @public
 */
export const CHAT_CONVERSATION_SIDEBAR_COPY = {
  deleteConfirmAction: 'Delete',
  deleteConfirmCancel: 'Cancel',
  deleteConfirmDescription: `This removes the conversation from your list. Its messages are retained and can be restored later.`,
  deleteConfirmTitle: 'Delete conversation?',
  emptyDescription: 'Your saved conversations will appear here.',
  emptyTitle: 'No conversations yet',
  errorTitle: 'Could not load conversations',
  loadMore: 'Load more',
  newChat: 'New chat',
  renamePlaceholder: 'Conversation title',
  retry: 'Retry',
  switcherDescription: `Browse, restore, rename, or delete your saved conversations.`,
  title: 'Conversations',
  untitled: 'Untitled conversation',
} as const;
