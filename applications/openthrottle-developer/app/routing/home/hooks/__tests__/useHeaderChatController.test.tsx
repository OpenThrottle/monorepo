import { ChatDialog } from '@openthrottle/react-router-chat';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { GlobalProviders } from '@openthrottle/react-router-ui-global';
import type { RenderResult } from '@testing-library/react';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultStore } from 'jotai';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearChatOptionsCache,
  writeChatOptionsCache,
} from '~/routing/home/utils/chat-options-cache';

import { useHeaderChatController } from '../useHeaderChatController';

// Return no ws client so the stream subscription never opens a real socket
// (an undici connection attempt otherwise surfaces as an async uncaught error).
// These tests exercise the toolbar + submit path, not live streaming.
vi.mock('~/services/getGraphqlWsClient', () => ({
  getGraphqlWsClient: () => null,
}));

const store = getDefaultStore();

const openaiModel = {
  description: 'ollama',
  groupId: 'openai:ollama',
  id: 'http://localhost:11434/v1::llama3',
  label: 'llama3',
};

const chatOptions = {
  agentRuntimes: {},
  models: [openaiModel],
  personas: [],
  repositories: [],
};

describe('useHeaderChatController (header chat surface)', () => {
  let actionSpy: ReturnType<
    typeof vi.fn<(entries: Record<string, FormDataEntryValue>) => void>
  >;
  let chatOptionsLoader: ReturnType<typeof vi.fn<() => typeof chatOptions>>;
  let startResult: {
    assistantMessageId: string | null;
    conversationId: string | null;
    errorMessage: string | null;
    userMessageId: string | null;
  };
  let conversationsAction: ReturnType<
    typeof vi.fn<
      () => {
        conversations: never[];
        errorMessage: null;
        totalCount: number;
      }
    >
  >;

  beforeEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
    actionSpy = vi.fn();
    startResult = {
      assistantMessageId: null,
      conversationId: 'conv-1',
      errorMessage: null,
      userMessageId: null,
    };
    chatOptionsLoader = vi.fn(() => chatOptions);
    conversationsAction = vi.fn(() => ({
      conversations: [],
      errorMessage: null,
      totalCount: 0,
    }));
    // Isolate the client-side discovery cache between tests.
    clearChatOptionsCache();
  });

  afterEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
    clearChatOptionsCache();
  });

  const renderHeader = (enabled = true): RenderResult => {
    const Harness = () => {
      const chat = useHeaderChatController({ enabled });
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
        action: () => conversationsAction(),
        path: '/resources/agent-conversations',
      },
      {
        action: async ({ request }) => {
          const formData = await request.formData();
          actionSpy(Object.fromEntries(formData.entries()));
          return startResult;
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

  describe('when disabled (logged out)', () => {
    test('fires no protected fetcher', async () => {
      const component = renderHeader(false);

      expect(
        await component.findByTestId('ChatComposerToolbar'),
      ).toBeInTheDocument();
      // Let any mount-time fetcher reach its route handler before asserting.
      await act(async () => {
        await Promise.resolve();
      });
      expect(conversationsAction).not.toHaveBeenCalled();
      expect(chatOptionsLoader).not.toHaveBeenCalled();
    });
  });

  test('lists conversations on mount when enabled', async () => {
    renderHeader();

    await waitFor(() => expect(conversationsAction).toHaveBeenCalledTimes(1));
  });

  describe('image attachments', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    const visionModel = { ...openaiModel, imageInput: true };

    beforeEach(() => {
      // Patch the two methods only: the router needs the real `URL` class.
      Object.assign(URL, {
        createObjectURL: () => 'blob:preview',
        revokeObjectURL: vi.fn(),
      });
      // The upload route answers every image with the same attachment id.
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json({ id: 'att-1' }, { status: 201 })),
      );
    });

    afterEach(() => {
      Reflect.deleteProperty(URL, 'createObjectURL');
      Reflect.deleteProperty(URL, 'revokeObjectURL');
      vi.unstubAllGlobals();
    });

    test('a picked image uploads and its id rides the sent turn', async () => {
      const user = userEvent.setup();
      writeChatOptionsCache({ ...chatOptions, models: [visionModel] });
      const component = renderHeader();
      const input = component.getByLabelText('Message');
      await waitFor(() => expect(input).not.toBeDisabled());

      await user.upload(
        component.getByTestId('ChatComposerAttachPicker-input'),
        png,
      );
      await user.type(input, 'What is this?');
      await user.click(component.getByRole('button', { name: 'Send' }));

      await waitFor(() =>
        expect(actionSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            attachmentIds: JSON.stringify(['att-1']),
            intent: 'start',
          }),
        ),
      );
    });

    test('the chip clears once the server accepts the turn', async () => {
      const user = userEvent.setup();
      writeChatOptionsCache({ ...chatOptions, models: [visionModel] });
      const component = renderHeader();
      const input = component.getByLabelText('Message');
      await waitFor(() => expect(input).not.toBeDisabled());

      await user.upload(
        component.getByTestId('ChatComposerAttachPicker-input'),
        png,
      );
      await user.type(input, 'What is this?');
      await user.click(component.getByRole('button', { name: 'Send' }));

      await waitFor(() => {
        expect(
          component.queryByRole('button', { name: 'Remove a.png' }),
        ).not.toBeInTheDocument();
      });
    });

    test('the chip stays when the server rejects the turn', async () => {
      const user = userEvent.setup();
      startResult = {
        assistantMessageId: null,
        conversationId: null,
        errorMessage: 'ATTACHMENT_NOT_FOUND',
        userMessageId: null,
      };
      writeChatOptionsCache({ ...chatOptions, models: [visionModel] });
      const component = renderHeader();
      const input = component.getByLabelText('Message');
      await waitFor(() => expect(input).not.toBeDisabled());

      await user.upload(
        component.getByTestId('ChatComposerAttachPicker-input'),
        png,
      );
      await component.findByRole('button', { name: 'Remove a.png' });
      await user.type(input, 'What is this?');
      await user.click(component.getByRole('button', { name: 'Send' }));

      await waitFor(() => expect(actionSpy).toHaveBeenCalled());
      // Let the rejected result land before asserting the chip survived it.
      await act(async () => {
        await Promise.resolve();
      });
      expect(
        component.getByRole('button', { name: 'Remove a.png' }),
      ).toBeInTheDocument();
    });

    test('a pasted image becomes a chip in the dialog', async () => {
      writeChatOptionsCache({ ...chatOptions, models: [visionModel] });
      const component = renderHeader();
      const input = component.getByLabelText('Message');
      await waitFor(() => expect(input).not.toBeDisabled());

      const paste = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(paste, 'clipboardData', {
        value: { files: [png], getData: () => '', types: ['Files'] },
      });
      act(() => {
        input.dispatchEvent(paste);
      });

      expect(
        await component.findByRole('button', { name: 'Remove a.png' }),
      ).toBeInTheDocument();
    });

    test('a model without imageInput disables the picker', async () => {
      writeChatOptionsCache(chatOptions);
      const component = renderHeader();
      await waitFor(() =>
        expect(component.getByLabelText('Message')).not.toBeDisabled(),
      );

      expect(
        component.getByTestId('ChatComposerToolbar-attach'),
      ).toBeDisabled();
    });
  });
});
