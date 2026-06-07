import * as React from 'react';
import {
  ChatProvider,
  useChatTurnFetcher,
} from '@openthrottle/react-router-chat';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  SidebarProvider,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';

export interface GlobalProvidersProps extends React.PropsWithChildren {
  /**
   * When true, chat turns POST `persist=true` and hydrate from server-backed
   * conversation history on mount.
   */
  readonly chatPersist?: boolean;
}

export const GlobalProviders = (
  props: GlobalProvidersProps,
): React.ReactElement => {
  const { chatPersist = false, children } = props;

  // Hooks
  const { composerDisabled, messages, sendUserMessage } = useChatTurnFetcher({
    action: '/',
    persist: chatPersist,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarProvider>
        <TooltipProvider>
          <ChatProvider
            composerDisabled={composerDisabled}
            messages={messages}
            onSendMessage={sendUserMessage}
          >
            {children}
          </ChatProvider>
        </TooltipProvider>
      </SidebarProvider>
    </DndProvider>
  );
};
