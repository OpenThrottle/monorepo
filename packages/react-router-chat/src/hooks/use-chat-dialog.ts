import { useChatOptional } from '../context/chat-context';
import type { ChatComposerControls } from '../context/chat-context';
import type { ChatConversationSidebarProps } from '../components/ChatConversationSidebar';
import type { ChatMessage } from '../types';

export interface UseChatDialogOptions {
  readonly composer?: ChatComposerControls;
  readonly composerDisabled?: boolean;
  readonly conversationSidebar?: ChatConversationSidebarProps;
  readonly messages?: readonly ChatMessage[];
  readonly onOpenChange?: (open: boolean) => void;
  readonly onSendMessage?: (message: string) => void;
  readonly open?: boolean;
}

export interface UseChatDialogResult {
  readonly composer: ChatComposerControls | undefined;
  readonly composerDisabled: boolean;
  readonly conversationSidebar: ChatConversationSidebarProps | undefined;
  readonly messages: readonly ChatMessage[];
  readonly onOpenChange: ((open: boolean) => void) | undefined;
  readonly onSendMessage: (message: string) => void;
  readonly onStartNewChat: (() => void) | undefined;
  readonly open: boolean | undefined;
}

/**
 * @description Resolves {@link ChatDialog}'s controlled inputs, letting an
 * explicit prop override the {@link ChatProvider} value for each field. The
 * optional agentic surface (composer + conversation switcher) falls back to the
 * provider the same way. Throws when neither a prop nor a provider supplies the
 * required `messages` / `onSendMessage`.
 *
 * @public
 */
export const useChatDialog = (
  options: UseChatDialogOptions,
): UseChatDialogResult => {
  const {
    composer: composerProp,
    composerDisabled: composerDisabledProp,
    conversationSidebar: conversationSidebarProp,
    messages: messagesProp,
    onOpenChange: onOpenChangeProp,
    onSendMessage: onSendMessageProp,
    open: openProp,
  } = options;

  const chatContext = useChatOptional();

  const messages = messagesProp ?? chatContext?.messages;
  const onSendMessage = onSendMessageProp ?? chatContext?.onSendMessage;

  if (!messages || !onSendMessage) {
    throw new Error(
      'ChatDialog requires messages and onSendMessage props, or a ChatProvider ancestor.',
    );
  }

  return {
    // Optional agentic surface: a prop overrides the provider. When present the
    // dialog renders the toolbar + streaming; when undefined it stays the bare
    // legacy shell (the dormant agentsRunChatTurn path).
    composer: composerProp ?? chatContext?.composer,
    composerDisabled:
      composerDisabledProp ?? chatContext?.composerDisabled ?? false,
    conversationSidebar:
      conversationSidebarProp ?? chatContext?.conversationSidebar,
    messages,
    onOpenChange: onOpenChangeProp ?? chatContext?.onOpenChange,
    onSendMessage,
    onStartNewChat: chatContext?.onStartNewChat,
    open: openProp ?? chatContext?.open,
  };
};
