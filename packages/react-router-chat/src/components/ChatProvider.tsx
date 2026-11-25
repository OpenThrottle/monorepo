import * as React from 'react';

import { ChatContext } from '../data/chat-context';
import type {
  ChatComposerControls,
  ChatContextValue,
  ChatMessage,
} from '../types';
import type { ChatConversationSidebarProps } from './ChatConversationSidebar';

export interface ChatProviderProps extends React.PropsWithChildren {
  /** Optional agentic-composer surface; see {@link ChatComposerControls}. */
  readonly composer?: ChatComposerControls;
  readonly composerDisabled?: boolean;
  /** Optional conversations switcher; see {@link ChatContextValue.conversationSidebar}. */
  readonly conversationSidebar?: ChatConversationSidebarProps;
  readonly messages: readonly ChatMessage[];
  readonly onOpenChange?: (open: boolean) => void;
  readonly onSendMessage: (message: string) => void;
  readonly onStartNewChat?: () => void;
  readonly open?: boolean;
}

/**
 * @description Supplies thread state and send handler to {@link ChatDialog} without prop drilling.
 */
export const ChatProvider = (props: ChatProviderProps): React.ReactElement => {
  const {
    children,
    composer,
    composerDisabled = false,
    conversationSidebar,
    messages,
    onOpenChange,
    onSendMessage,
    onStartNewChat,
    open,
  } = props;

  // Hooks
  const value = React.useMemo<ChatContextValue>(
    () => ({
      composer,
      composerDisabled,
      conversationSidebar,
      messages,
      onOpenChange,
      onSendMessage,
      onStartNewChat,
      open,
    }),
    [
      composer,
      composerDisabled,
      conversationSidebar,
      messages,
      onOpenChange,
      onSendMessage,
      onStartNewChat,
      open,
    ],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
