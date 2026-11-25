import * as React from 'react';

import { ChatContext } from '../data/chat-context';
import type { ChatContextValue } from '../types';

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
