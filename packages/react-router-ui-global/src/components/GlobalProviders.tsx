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

export interface GlobalProvidersProps extends React.PropsWithChildren {}

export const GlobalProviders = (
  props: GlobalProvidersProps,
): React.ReactElement => {
  const { children } = props;

  // Hooks
  const { composerDisabled, messages, sendUserMessage } = useChatTurnFetcher({
    action: '/',
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
