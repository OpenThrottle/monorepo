import * as React from 'react';
import type { ChatMessage } from '../types';

export interface ChatContextValue {
  readonly composerDisabled: boolean;
  readonly messages: readonly ChatMessage[];
  readonly onOpenChange: ((open: boolean) => void) | undefined;
  readonly onSendMessage: (message: string) => void;
  /**
   * When set (persisted chat mode), {@link ChatDialog} renders a New chat control.
   */
  readonly onStartNewChat: (() => void) | undefined;
  readonly open: boolean | undefined;
}

export interface ChatProviderProps extends React.PropsWithChildren {
  readonly composerDisabled?: boolean;
  readonly messages: readonly ChatMessage[];
  readonly onOpenChange?: (open: boolean) => void;
  readonly onSendMessage: (message: string) => void;
  readonly onStartNewChat?: () => void;
  readonly open?: boolean;
}

const ChatContext = React.createContext<ChatContextValue | null>(null);

/**
 * @description Supplies thread state and send handler to {@link ChatDialog} without prop drilling.
 */
export const ChatProvider = (props: ChatProviderProps): React.ReactElement => {
  const {
    children,
    composerDisabled = false,
    messages,
    onOpenChange,
    onSendMessage,
    onStartNewChat,
    open,
  } = props;

  const value = React.useMemo<ChatContextValue>(
    () => ({
      composerDisabled,
      messages,
      onOpenChange,
      onSendMessage,
      onStartNewChat,
      open,
    }),
    [
      composerDisabled,
      messages,
      onOpenChange,
      onSendMessage,
      onStartNewChat,
      open,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

/**
 * @description Reads chat state from {@link ChatProvider}; throws when used outside the provider.
 */
export const useChat = (): ChatContextValue => {
  const context = React.useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider.');
  }

  return context;
};

/**
 * @description Optional {@link useChat} for components that support both props and context.
 */
export const useChatOptional = (): ChatContextValue | null =>
  React.useContext(ChatContext);
