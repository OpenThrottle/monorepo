import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import type { UseSessionDrawerResult } from '~/routing/home/hooks/useSessionDrawer';

import type { HomeLayoutProps } from '../HomeLayout';
import { HomeLayout } from '../HomeLayout';

const conversationList: UseConversationListResult = {
  conversations: [],
  errorMessage: null,
  insert: vi.fn(),
  isLoading: false,
  isLoadingMore: false,
  loadMore: vi.fn(),
  mapConversations: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  restore: vi.fn(),
  totalCount: 0,
};

const turn: UseAgenticChatTurnResult = {
  canRetry: false,
  clearQueue: vi.fn(),
  conversationId: null,
  editQueued: vi.fn(),
  error: null,
  isQueuePaused: false,
  isStreaming: false,
  messages: [],
  onRespondToPermission: vi.fn(),
  onRetry: vi.fn(),
  onStop: vi.fn(),
  queuedMessages: [],
  removeQueued: vi.fn(),
  reset: vi.fn(),
  restore: vi.fn(),
  resumeQueue: vi.fn(),
  sendQueuedNow: vi.fn(),
  sessionUsage: {},
  setError: vi.fn(),
  submitTurn: vi.fn(),
};

const drawer: UseSessionDrawerResult = {
  collapsedSections: [],
  environment: undefined,
  isOpen: true,
  isSheetOpen: false,
  setEnvironment: vi.fn(),
  setSheetOpen: vi.fn(),
  toggleOpen: vi.fn(),
  toggleSection: vi.fn(),
};

const renderLayout = (): RenderResult => {
  // A never-resolving bundle keeps the composer in its skeleton.
  const props: HomeLayoutProps = {
    composerData: new Promise<never>(() => {}),
    conversationList,
    drawer,
    turn,
  };
  const Component = (): React.ReactElement => {
    return <HomeLayout {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('HomeLayout Component', () => {
  test('renders the thread column with the session drawer beside it', () => {
    const component = renderLayout();

    expect(component.getByTestId('HomeLayout')).toBeInTheDocument();
    expect(component.getByTestId('HomeSessionDrawer')).toBeInTheDocument();
  });

  test('shows the hero heading while the thread is empty', () => {
    const component = renderLayout();

    expect(component.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
