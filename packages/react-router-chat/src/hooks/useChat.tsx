import * as React from 'react';

import type { ChatContextValue } from '../context/chat-context';
import { ChatContext } from '../data/chat-context';

/**
 * @description Reads chat state from {@link ChatProvider}; throws when used outside the provider.
 */
export const useChat = (): ChatContextValue => {
  // Hooks
  const context = React.useContext(ChatContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider.');
  }

  return context;
};
