import * as React from 'react';

import type { ChatContextValue } from '../context/chat-context';

/** The React context {@link ChatProvider} supplies and `useChat` / `useChatOptional` read. */
export const ChatContext = React.createContext<ChatContextValue | null>(null);
