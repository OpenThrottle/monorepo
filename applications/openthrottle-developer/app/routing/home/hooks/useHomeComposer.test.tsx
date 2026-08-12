import { act, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { getDefaultStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import {
  useHomeComposer,
  type UseHomeComposerOptions,
} from './useHomeComposer';

// No live ws client: useVoiceInput's transcription stream and useSubscription
// both no-op on a null client, so tests exercise composer state, not sockets.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

const store = getDefaultStore();

const openaiModel: ChatModelOption = {
  description: 'ollama',
  groupId: 'openai:ollama',
  id: 'http://localhost:11434/v1::llama3',
  label: 'llama3',
};

const cliModel: ChatModelOption = {
  description: 'Claude CLI',
  groupId: 'claude',
  id: 'claude|sonnet',
  label: 'Sonnet',
};

const repositoryA: RepositoryOption = {
  displayName: 'repo-a',
  id: 'repo-a-id',
};

const makeTurn = (
  overrides: Partial<UseAgenticChatTurnResult> = {},
): UseAgenticChatTurnResult => ({
  canRetry: false,
  conversationId: null,
  error: null,
  isStreaming: false,
  messages: [],
  onRetry: vi.fn(),
  onStop: vi.fn(),
  reset: vi.fn(),
  restore: vi.fn(),
  sessionUsage: {},
  setError: vi.fn(),
  submitTurn: vi.fn(),
  ...overrides,
});

const makeConversationList = (
  overrides: Partial<UseConversationListResult> = {},
): UseConversationListResult => ({
  conversations: [],
  isLoading: false,
  isLoadingMore: false,
  loadMore: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  totalCount: 0,
  ...overrides,
});

const value: {
  current: ReturnType<typeof useHomeComposer> | null;
} = { current: null };

function HookProbe(props: UseHomeComposerOptions): null {
  value.current = useHomeComposer(props);
  return null;
}

function buildStub(
  overrides: Partial<UseHomeComposerOptions> = {},
): React.ReactElement {
  const props: UseHomeComposerOptions = {
    conversationList: makeConversationList(),
    models: [openaiModel],
    personas: [],
    repositories: [repositoryA],
    turn: makeTurn(),
    ...overrides,
  };

  const RoutesStub = createRoutesStub([
    // eslint-disable-next-line react/no-multi-comp -- test-local harness component
    { Component: () => <HookProbe {...props} />, path: '/' },
  ]);
  return <RoutesStub />;
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderComposer(
  overrides: Partial<UseHomeComposerOptions> = {},
): Promise<ReturnType<typeof render>> {
  const result = render(buildStub(overrides));
  await flush();
  return result;
}

describe('useHomeComposer', () => {
  beforeEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
    value.current = null;
  });

  afterEach(() => {
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
  });

  test('reports hasModels/hasRepositories from the discovered lists', async () => {
    await renderComposer();

    expect(value.current?.hasModels).toBe(true);
    expect(value.current?.hasRepositories).toBe(true);
    expect(value.current?.modelId).toBe(openaiModel.id);
  });

  test('falls back to the mock persona list when none is discovered', async () => {
    await renderComposer({ personas: [] });

    expect(value.current?.personas.length).toBeGreaterThan(0);
  });

  test('uses the discovered persona list when non-empty', async () => {
    const persona: ChatPersonaOption = { id: 'p1', label: 'Persona One' };
    await renderComposer({ personas: [persona] });

    expect(value.current?.personas).toEqual([persona]);
  });

  test('isCliBackend is false for the plain openai backend', async () => {
    await renderComposer({ models: [openaiModel] });

    expect(value.current?.isCliBackend).toBe(false);
  });

  test('isCliBackend is true once a CLI-backed model is selected', async () => {
    await renderComposer({ models: [cliModel] });

    expect(value.current?.modelId).toBe(cliModel.id);
    expect(value.current?.isCliBackend).toBe(true);
  });

  test('setDraft updates the draft text', async () => {
    await renderComposer();

    act(() => value.current?.setDraft('hello there'));

    expect(value.current?.draft).toBe('hello there');
  });

  test('setModelId persists through the toolbar atom and reconciles back', async () => {
    await renderComposer({ models: [openaiModel, cliModel] });

    act(() => value.current?.setModelId(cliModel.id));

    expect(value.current?.modelId).toBe(cliModel.id);
    expect(store.get(chatToolbarStateAtom).modelId).toBe(cliModel.id);
  });

  test('checkouts map repositories to {id, label} pairs', async () => {
    await renderComposer({
      repositories: [repositoryA, { displayName: 'repo-b', id: 'repo-b-id' }],
    });

    expect(value.current?.checkouts).toEqual([
      { id: 'repo-a-id', label: 'repo-a' },
      { id: 'repo-b-id', label: 'repo-b' },
    ]);
  });

  test('onSubmit is a no-op for an empty (whitespace) message', async () => {
    const turn = makeTurn();
    await renderComposer({ turn });

    act(() => value.current?.onSubmit('   '));

    expect(turn.submitTurn).not.toHaveBeenCalled();
  });

  test('onSubmit is a no-op when no model is selected', async () => {
    const turn = makeTurn();
    await renderComposer({ models: [], turn });

    act(() => value.current?.onSubmit('hello'));

    expect(turn.submitTurn).not.toHaveBeenCalled();
  });

  test('onSubmit surfaces an error and skips submitTurn for a CLI backend with no repository', async () => {
    const turn = makeTurn();
    await renderComposer({ models: [cliModel], repositories: [], turn });

    act(() => value.current?.onSubmit('hello agent'));

    expect(turn.setError).toHaveBeenCalledWith(
      'Select a repository to run the agent in.',
    );
    expect(turn.submitTurn).not.toHaveBeenCalled();
  });

  test('onSubmit builds openai-shaped fields for the plain HTTP backend', async () => {
    const turn = makeTurn();
    await renderComposer({ models: [openaiModel], turn });

    act(() => value.current?.onSubmit('hello world'));

    expect(turn.setError).toHaveBeenCalledWith(null);
    expect(turn.submitTurn).toHaveBeenCalledWith(
      'hello world',
      expect.objectContaining({
        backend: 'openai',
        baseUrl: 'http://localhost:11434/v1',
        modelId: 'llama3',
      }),
    );
  });

  test('onSubmit builds CLI-shaped fields with fileMentions when a repository is selected', async () => {
    const turn = makeTurn();
    await renderComposer({
      models: [cliModel],
      repositories: [repositoryA],
      turn,
    });

    act(() => value.current?.setRepositoryId(repositoryA.id));
    act(() => value.current?.onSubmit('check @src/index.ts please'));

    expect(turn.submitTurn).toHaveBeenCalledWith(
      'check @src/index.ts please',
      expect.objectContaining({
        backend: 'claude',
        fileMentions: JSON.stringify(['src/index.ts']),
        modelId: 'sonnet',
        repositoryId: repositoryA.id,
      }),
    );
  });

  test('refreshes the conversation list once a new persisted conversation id appears', async () => {
    const conversationList = makeConversationList();
    // A single stable RoutesStub instance reads props from a mutable ref so a
    // rerender re-invokes HookProbe without remounting the route tree (which
    // would otherwise reset the hook's internal dedupe ref).
    const propsRef: { current: UseHomeComposerOptions } = {
      current: {
        conversationList,
        models: [openaiModel],
        personas: [],
        repositories: [repositoryA],
        turn: makeTurn({ conversationId: 'conv-1' }),
      },
    };
    const RoutesStub = createRoutesStub([
      // eslint-disable-next-line react/no-multi-comp -- test-local harness component
      { Component: () => <HookProbe {...propsRef.current} />, path: '/' },
    ]);
    const { rerender } = render(<RoutesStub />);
    await flush();

    expect(conversationList.refresh).toHaveBeenCalledTimes(1);

    rerender(<RoutesStub />);
    await flush();

    // Same conversation id: dedupe ref prevents a second refresh.
    expect(conversationList.refresh).toHaveBeenCalledTimes(1);
  });

  test('does not refresh the conversation list when the turn is Private (persist=false)', async () => {
    const conversationList = makeConversationList();
    store.set(chatToolbarStateAtom, {
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      persist: false,
    });

    await renderComposer({
      conversationList,
      turn: makeTurn({ conversationId: 'conv-private' }),
    });

    expect(conversationList.refresh).not.toHaveBeenCalled();
  });
});
