import * as React from 'react';

import type { ChatContextValue } from '../context/ChatProvider';
import { ChatContext } from '../data/data.chat-context';

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
