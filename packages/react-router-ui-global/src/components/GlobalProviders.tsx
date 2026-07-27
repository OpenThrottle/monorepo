import * as React from 'react';
import { ChatProvider } from '@openthrottle/react-router-chat';
import type { ChatProviderProps } from '@openthrottle/react-router-chat';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  SidebarProvider,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import { LegacyChatTurnProvider } from './LegacyChatTurnProvider';

/**
 * A fully host-owned chat surface (streaming messages + the seven-control
 * toolbar via {@link ChatProviderProps.composer}) injected into the header
 * {@link ChatProvider}. It is exactly the ChatProvider inputs minus `children`.
 */
export type GlobalChatSurface = Omit<ChatProviderProps, 'children'>;

export interface GlobalProvidersProps extends React.PropsWithChildren {
  /**
   * Inject a host-owned chat surface (streaming messages + toolbar). When
   * provided, it drives the header ChatProvider directly; when omitted,
   * GlobalProviders falls back to the legacy useChatTurnFetcher
   * (send-agent-message) provider gated by {@link chatPersist}.
   */
  readonly chat?: GlobalChatSurface;
  /**
   * When true, the legacy chat provider POSTs `persist=true` and hydrates from
   * server-backed conversation history on mount. Ignored when {@link chat} is
   * supplied.
   */
  readonly chatPersist?: boolean;
}

export const GlobalProviders = (
  props: GlobalProvidersProps,
): React.ReactElement => {
  const { chat, chatPersist = false, children } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarProvider>
        <TooltipProvider>
          {chat ? (
            <ChatProvider {...chat}>{children}</ChatProvider>
          ) : (
            <LegacyChatTurnProvider chatPersist={chatPersist}>
              {children}
            </LegacyChatTurnProvider>
          )}
        </TooltipProvider>
      </SidebarProvider>
    </DndProvider>
  );
};
