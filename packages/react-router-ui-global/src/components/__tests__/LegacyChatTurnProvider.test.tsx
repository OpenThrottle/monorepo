import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import * as ReactRouterChat from '@openthrottle/react-router-chat';
import { useChat } from '@openthrottle/react-router-chat';
import type { ChatMessage } from '@openthrottle/react-router-chat';
import { LegacyChatTurnProvider } from '../LegacyChatTurnProvider';
import type { LegacyChatTurnProviderProps } from '../LegacyChatTurnProvider';

vi.mock('@openthrottle/react-router-chat', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-chat')>();
  return {
    ...actual,
    useChatTurnFetcher: vi.fn(),
  };
});

const mockUseChatTurnFetcher = vi.mocked(ReactRouterChat.useChatTurnFetcher);

afterEach(() => {
  cleanup();
});

function ContextProbe(): React.ReactElement {
  const chat = useChat();

  return (
    <div>
      <span data-testid="composer-disabled">
        {chat.composerDisabled ? 'yes' : 'no'}
      </span>
      <span data-testid="message-count">{chat.messages.length}</span>
      <span data-testid="has-start-new-chat">
        {chat.onStartNewChat ? 'yes' : 'no'}
      </span>
      <button
        onClick={() => {
          chat.onSendMessage('hello');
        }}
        type="button"
      >
        send
      </button>
    </div>
  );
}

describe('LegacyChatTurnProvider Component', () => {
  let component: RenderResult;
  let props: LegacyChatTurnProviderProps;
  let sendUserMessage: (message: string) => void;
  let startNewChat: () => void;
  let messages: ChatMessage[];

  beforeEach(() => {
    sendUserMessage = vi.fn();
    startNewChat = vi.fn();
    messages = [{ body: 'hi', id: '1', role: 'user' }];

    mockUseChatTurnFetcher.mockReturnValue({
      appendMessage: vi.fn(),
      composerDisabled: false,
      conversationId: null,
      errorMessage: null,
      isLoadingHistory: false,
      isSubmitting: false,
      lastTurn: null,
      messages,
      sendUserMessage,
      setMessages: vi.fn(),
      startNewChat,
    });

    props = { chatPersist: false };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <LegacyChatTurnProvider {...props}>
        <ContextProbe />
      </LegacyChatTurnProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('threads useChatTurnFetcher messages into the ChatProvider context', () => {
    expect(component.getByTestId('message-count')).toHaveTextContent('1');
    expect(component.getByTestId('composer-disabled')).toHaveTextContent('no');
  });

  test('calls useChatTurnFetcher with the root action and chatPersist flag', () => {
    expect(mockUseChatTurnFetcher).toHaveBeenCalledWith(
      expect.objectContaining({ action: '/', persist: false }),
    );
  });

  test('does not expose onStartNewChat when chatPersist is false', () => {
    expect(component.getByTestId('has-start-new-chat')).toHaveTextContent('no');
  });

  test('exposes onStartNewChat when chatPersist is true', () => {
    cleanup();
    props = { chatPersist: true };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <LegacyChatTurnProvider {...props}>
        <ContextProbe />
      </LegacyChatTurnProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('has-start-new-chat')).toHaveTextContent('yes');
    expect(mockUseChatTurnFetcher).toHaveBeenLastCalledWith(
      expect.objectContaining({ persist: true }),
    );
  });

  test('forwards onSendMessage through the context to sendUserMessage', async () => {
    const user = userEvent.setup();
    await user.click(component.getByRole('button', { name: 'send' }));
    expect(sendUserMessage).toHaveBeenCalledWith('hello');
  });
});
