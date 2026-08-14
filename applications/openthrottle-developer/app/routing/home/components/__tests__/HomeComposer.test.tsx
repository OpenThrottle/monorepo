import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import { HomeComposer } from '../HomeComposer';
import type { HomeComposerProps } from '../HomeComposer';

const buildConversationList = (): UseConversationListResult => ({
  conversations: [],
  isLoading: false,
  isLoadingMore: false,
  loadMore: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  totalCount: 0,
});

const buildTurn = (
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

const models: ChatModelOption[] = [
  { id: 'openai::http://localhost:11434/v1::llama3', label: 'llama3' },
];

const personas: ChatPersonaOption[] = [];

const repositories: RepositoryOption[] = [
  { displayName: 'monorepo', id: 'repo-1' },
];

const renderComposer = (composerProps: HomeComposerProps): RenderResult => {
  const Wrapped = (): React.ReactElement => (
    <TooltipProvider>
      <HomeComposer {...composerProps} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('HomeComposer Component', () => {
  let component: RenderResult;
  let props: HomeComposerProps;

  beforeEach(() => {
    props = {
      conversationList: buildConversationList(),
      models,
      personas,
      repositories,
      turn: buildTurn(),
    };

    component = renderComposer(props);
  });

  test('renders the composer textbox', () => {
    expect(component.getByRole('textbox')).toBeInTheDocument();
  });

  test('shows the no-local-models message when no models are discovered', () => {
    component.unmount();
    component = renderComposer({ ...props, models: [] });

    expect(
      component.getByText(/No local models discovered/i),
    ).toBeInTheDocument();
  });

  test('surfaces the turn error via InlineErrors', () => {
    component.unmount();
    component = renderComposer({
      ...props,
      turn: buildTurn({ error: 'Something went wrong.' }),
    });

    expect(component.getByText('Something went wrong.')).toBeInTheDocument();
  });

  test('does not hint to register a repository for the plain openai backend', () => {
    component.unmount();
    component = renderComposer({ ...props, repositories: [] });

    expect(
      component.queryByText(/Register a local repository/i),
    ).not.toBeInTheDocument();
  });

  test('hints to register a repository when a CLI backend has none registered', () => {
    component.unmount();
    component = renderComposer({
      ...props,
      models: [{ id: 'claude', label: 'Claude Code' }],
      repositories: [],
    });

    expect(
      component.getByText(/Register a local repository/i),
    ).toBeInTheDocument();
  });
});
