import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatDialog } from '@openthrottle/react-router-chat';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { GlobalProviders } from '@openthrottle/react-router-ui-global';
import { getDefaultStore } from 'jotai';
import {
  clearChatOptionsCache,
  writeChatOptionsCache,
} from '~/routing/home/data/chat-options-cache';
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
  let chatOptionsLoader: ReturnType<typeof vi.fn<() => typeof chatOptions>>;

  beforeEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
    actionSpy = vi.fn();
    chatOptionsLoader = vi.fn(() => chatOptions);
    // Isolate the client-side discovery cache between tests.
    clearChatOptionsCache();
  });

  afterEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
    clearChatOptionsCache();
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
        loader: () => chatOptionsLoader(),
        path: '/resources/chat-options',
      },
      {
        // The switcher's mount-time list fetch resolves empty here.
        action: () => ({
          conversations: [],
          errorMessage: null,
          totalCount: 0,
        }),
        path: '/resources/agent-conversations',
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

  test('reuses a warm client cache and skips the chat-options probe', async () => {
    // A prior mount left a fresh discovery result in the client cache.
    writeChatOptionsCache(chatOptions);

    const component = renderHeader();

    // Composer is enabled straight from the cache…
    const input = component.getByLabelText('Message');
    await waitFor(() => expect(input).not.toBeDisabled());

    // …and the resource-route loader was never hit (no re-probe).
    expect(chatOptionsLoader).not.toHaveBeenCalled();
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
