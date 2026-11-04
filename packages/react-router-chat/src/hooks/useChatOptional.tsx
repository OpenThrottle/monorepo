import * as React from 'react';

import type { ChatContextValue } from '../context/chat-context';
import { ChatContext } from '../data/chat-context';

/**
 * @description Optional {@link useChat} for components that support both props and context.
 */
export const useChatOptional = (): ChatContextValue | null => {
  // Hooks
  const context = React.useContext(ChatContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return context;
};
