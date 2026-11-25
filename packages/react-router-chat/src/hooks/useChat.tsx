import * as React from 'react';

import { ChatContext } from '../data/chat-context';
import type { ChatContextValue } from '../types';

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
