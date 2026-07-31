import * as React from 'react';
import type { ChatComposerToolbarProps } from '../components/ChatComposerToolbar';
import type { ChatConversationSidebarProps } from '../components/ChatConversationSidebar';
import type { ChatMessage, ChatTokenUsage } from '../types';

/**
 * The full agentic-composer surface a host app injects to upgrade
 * {@link ChatDialog} from a bare thread + composer to the seven-control
 * {@link ChatComposerToolbar} + streaming send/stop. It is exactly
 * {@link ChatComposerToolbarProps} (minus its layout `className`) plus the
 * composer's streaming affordance — every field optional and presentational.
 * When a host supplies this, {@link ChatDialog} renders the toolbar and threads
 * the streaming state through the composer; when it does not, the dialog stays
 * the bare legacy shell. The package hardcodes no option/capability data — the
 * host owns all state (selections, discovery data, capabilities, mic, streaming).
 *
 * @public
 */
export interface ChatComposerControls extends Omit<
  ChatComposerToolbarProps,
  'className'
> {
  /**
   * When true, the last turn timed out and its single automatic retry is spent —
   * {@link ChatDialog} renders a manual Retry affordance wired to {@link onRetry}.
   */
  readonly canRetry?: boolean;
  /**
   * Mirrors the composer's `isStreaming`: when true the composer swaps Send for
   * a Stop button wired to {@link onStop}.
   */
  readonly isStreaming?: boolean;
  /** Replay the last turn; surfaced by the Retry affordance when {@link canRetry}. */
  readonly onRetry?: () => void;
  /** Invoked when the composer's Stop button is pressed while {@link isStreaming}. */
  readonly onStop?: () => void;
  /**
   * Cumulative session token usage (summed across turns via `sumUsage`),
   * rendered as the composer's running {@link ChatUsageCounter}. Presentational —
   * the consumer owns the total. Omit to hide the counter.
   */
  readonly sessionUsage?: ChatTokenUsage;
}

export interface ChatContextValue {
  /**
   * Optional agentic-composer surface. When present, {@link ChatDialog} renders
   * the {@link ChatComposerToolbar} + streaming send/stop; when absent it falls
   * back to the bare thread + composer (the dormant legacy path).
   */
  readonly composer: ChatComposerControls | undefined;
  readonly composerDisabled: boolean;
  /**
   * Optional persisted-conversations switcher. When present, {@link ChatDialog}
   * renders a "Conversations" popover backed by {@link ChatConversationSidebar}
   * (list / restore / rename / soft-delete / new chat). Omit for the bare shell.
   */
  readonly conversationSidebar: ChatConversationSidebarProps | undefined;
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

const ChatContext = React.createContext<ChatContextValue | null>(null);

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
