import * as React from 'react';
import {
  ChatProvider,
  useChatTurnFetcher,
} from '@openthrottle/react-router-chat';

export interface LegacyChatTurnProviderProps extends React.PropsWithChildren {
  /**
   * When true, chat turns POST `persist=true` and hydrate from server-backed
   * conversation history on mount.
   */
  readonly chatPersist: boolean;
}

/**
 * @description The v0 header-chat provider: wires {@link useChatTurnFetcher}
 * (send-agent-message → agentsRunChatTurn, non-streaming, no toolbar) into a
 * {@link ChatProvider}. Used when a host app does NOT inject a richer streaming
 * chat surface into {@link GlobalProviders} — i.e. the dormant legacy path,
 * pending consolidation (plan d246beb9).
 */
export const LegacyChatTurnProvider = (
  props: LegacyChatTurnProviderProps,
): React.ReactElement => {
  const { chatPersist, children } = props;

  const { composerDisabled, messages, sendUserMessage, startNewChat } =
    useChatTurnFetcher({
      action: '/',
      persist: chatPersist,
    });

  return (
    <ChatProvider
      composerDisabled={composerDisabled}
      messages={messages}
      onSendMessage={sendUserMessage}
      onStartNewChat={chatPersist ? startNewChat : undefined}
    >
      {children}
    </ChatProvider>
  );
};
