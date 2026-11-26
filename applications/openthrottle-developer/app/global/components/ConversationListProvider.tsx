import { useConversationList } from '@openthrottle/react-router-chat';
import * as React from 'react';

import type { ConversationListContextValue } from '~/global/config/ConversationListContext';
import { ConversationListContext } from '~/global/config/ConversationListContext';

export interface ConversationListProviderProps {
  readonly children: React.ReactNode;
  /** Whether conversations may be fetched; false while logged out. */
  readonly enabled: boolean;
}

/**
 * @description Owns the app's single conversation list and the chat route's
 * open conversation, so a chat the composer just started shows up — and is
 * highlighted — in the dock at once, instead of after a refresh.
 */
export const ConversationListProvider = (
  props: ConversationListProviderProps,
): React.ReactElement => {
  const { children, enabled } = props;

  // Hooks
  const list = useConversationList({ enabled });
  const [activeConversationId, setActiveConversationId] = React.useState<
    string | null
  >(null);

  // Setup
  const value: ConversationListContextValue = {
    activeConversationId,
    list,
    setActiveConversationId,
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ConversationListContext.Provider value={value}>
      {children}
    </ConversationListContext.Provider>
  );
};
