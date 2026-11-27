import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import { DefaultEditorContext } from '~/global/config/DefaultEditorContext';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import type { UseSessionDrawerResult } from '~/routing/home/hooks/useSessionDrawer';

import type { HomeLayoutProps } from '../HomeLayout';
import { HomeLayout } from '../HomeLayout';

vi.mock('~/routing/home/hooks/useCheckoutDiff', () => {
  return {
    useCheckoutDiff: () => {
      return {
        diff: {
          additions: 1,
          available: true,
          baseRef: 'origin/main',
          deletions: 0,
          files: [
            {
              additions: 1,
              binary: false,
              deletions: 0,
              path: 'src/a b.ts',
              previousPath: undefined,
              status: 'modified',
            },
          ],
          filesTruncated: false,
          headBranch: 'feat/x',
          pullRequest: undefined,
        },
        isLoading: false,
        isPatchTruncated: false,
        onCloseFile: vi.fn(),
        onRefresh: vi.fn(),
        onSelectFile: vi.fn(),
        selectedFile: undefined,
        selectedPatch: undefined,
      };
    },
  };
});

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
  loadEarlier: {
    hasEarlier: false,
    isLoading: false,
    onLoadEarlier: vi.fn(),
  },
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

const renderLayout = (
  environment: UseSessionDrawerResult['environment'] = undefined,
  editor: WorkspaceEditorId | null = null,
): RenderResult => {
  // A never-resolving bundle keeps the composer in its skeleton.
  const props: HomeLayoutProps = {
    composerData: new Promise<never>(() => {}),
    conversationList,
    drawer: { ...drawer, environment },
    turn,
  };
  const Component = (): React.ReactElement => {
    return (
      <DefaultEditorContext.Provider value={editor}>
        <HomeLayout {...props} />
      </DefaultEditorContext.Provider>
    );
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

  describe('open-in-editor links on changed files', () => {
    const environment: UseSessionDrawerResult['environment'] = {
      agentLabel: undefined,
      checkout: {
        defaultBranch: undefined,
        filesystemPath: '/work/my repo',
        id: 'c1',
        label: 'repo',
      },
      modelLabel: undefined,
      permissionMode: undefined,
      reasoning: undefined,
    };

    test('uses the default editor and the checkout path', () => {
      const component = renderLayout(environment, WorkspaceEditorId.Cursor);

      expect(
        component.getByRole('link', { name: /Open src\/a b.ts/ }),
      ).toHaveAttribute('href', 'cursor://file/work/my%20repo/src/a%20b.ts');
    });

    test('is hidden without a checkout path', () => {
      const component = renderLayout(undefined);

      expect(component.queryByRole('link', { name: /Open src/ })).toBeNull();
    });
  });
});
