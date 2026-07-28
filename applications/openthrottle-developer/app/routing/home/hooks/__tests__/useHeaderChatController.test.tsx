import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatComposerMode, ChatDialog } from '@openthrottle/react-router-chat';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { GlobalProviders } from '@openthrottle/react-router-ui-global';
import { getDefaultStore } from 'jotai';
import { useHeaderChatController } from '../useHeaderChatController';

// Return no ws client so the stream subscription never opens a real socket
// (an undici connection attempt otherwise surfaces as an async uncaught error).
// These tests exercise the toolbar + submit path, not live streaming.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

const store = getDefaultStore();

const openaiModel = {
  description: 'ollama',
  groupId: 'openai:ollama',
  id: 'http://localhost:11434/v1::llama3',
  label: 'llama3',
};

const chatOptions = { models: [openaiModel], personas: [], repositories: [] };

describe('useHeaderChatController (header chat surface)', () => {
  let actionSpy: ReturnType<
    typeof vi.fn<(entries: Record<string, FormDataEntryValue>) => void>
  >;

  beforeEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
    actionSpy = vi.fn();
  });

  afterEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
  });

  const renderHeader = (): RenderResult => {
    const Harness = () => {
      const chat = useHeaderChatController({ enabled: true });
      return (
        <GlobalProviders chat={chat}>
          <ChatDialog open={true} title="Assistant" triggerLabel="Chat" />
        </GlobalProviders>
      );
    };

    const RoutesStub = createRoutesStub([
      { Component: Harness, path: '/' },
      {
        loader: () => chatOptions,
        path: '/resources/chat-options',
      },
      {
        action: async ({ request }) => {
          const formData = await request.formData();
          actionSpy(Object.fromEntries(formData.entries()));
          return {
            assistantMessageId: null,
            conversationId: 'conv-1',
            errorMessage: null,
            userMessageId: null,
          };
        },
        path: '/resources/conversation-stream',
      },
    ]);

    return render(<RoutesStub />);
  };

  test('renders the toolbar inside the open header dialog', async () => {
    const component = renderHeader();

    expect(
      await component.findByTestId('ChatComposerToolbar'),
    ).toBeInTheDocument();
    expect(
      await component.findByTestId('ChatComposerToolbar-mode-build'),
    ).toBeInTheDocument();
  });

  test('a toolbar control change updates the shared persisted atom', async () => {
    const user = userEvent.setup();
    const component = renderHeader();

    await user.click(
      await component.findByTestId('ChatComposerToolbar-mode-build'),
    );

    await waitFor(() =>
      expect(store.get(chatToolbarStateAtom).mode).toBe('build'),
    );
  });

  test('sending a message posts intent=start to the conversation-stream action', async () => {
    const user = userEvent.setup();
    const component = renderHeader();

    // Wait for discovery options to load so the composer is enabled.
    const input = component.getByLabelText('Message');
    await waitFor(() => expect(input).not.toBeDisabled());

    await user.type(input, 'Hello agent');
    await user.click(component.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(actionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'start', message: 'Hello agent' }),
      ),
    );
  });

  test('rehydrates the persisted toolbar mode into the header toolbar', async () => {
    store.set(chatToolbarStateAtom, {
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      mode: ChatComposerMode.build,
    });

    const component = renderHeader();

    await waitFor(() =>
      expect(
        component.getByTestId('ChatComposerToolbar-mode-build'),
      ).toHaveAttribute('aria-checked', 'true'),
    );
  });

  test('reconciles a stale persisted model id without crashing', async () => {
    store.set(chatToolbarStateAtom, {
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      modelId: 'removed-endpoint::gone',
    });

    const component = renderHeader();

    // The derive-only reconciler falls back to a valid model; the toolbar
    // renders rather than throwing on the stale id.
    expect(
      await component.findByTestId('ChatComposerToolbar'),
    ).toBeInTheDocument();
  });
});
