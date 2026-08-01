import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../_index';
import type { Route } from '@/app/routes/+types/_index';

// Isolate the client-state hooks so we can assert the deep-link effect without
// the real turn lifecycle / conversation-list resource fetch. Scoped to this
// file (the other _index tests exercise the real hooks).
const hoisted = vi.hoisted(() => ({
  resetSpy: vi.fn(),
  restoreSpy: vi.fn(),
}));

vi.mock('~/routing/home/hooks/useAgenticChatTurn', () => ({
  useAgenticChatTurn: () => ({
    conversationId: null,
    messages: [],
    reset: hoisted.resetSpy,
    restore: hoisted.restoreSpy,
  }),
}));

vi.mock('~/routing/home/hooks/useConversationList', () => ({
  useConversationList: () => ({
    conversations: [],
    isLoading: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    totalCount: 0,
  }),
}));

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData: { composerData: new Promise<never>(() => {}) },
    params: {},
    pathname: '/',
  },
];

// A never-resolving composer promise keeps the Suspense boundary in its
// skeleton, so the deferred composer subtree never mounts and the assertion
// stays focused on the mount-time restore effect.
const loaderData: Route.ComponentProps['loaderData'] = {
  composerData: new Promise<never>(() => {}),
};

const renderAt = (entry: string) => {
  const Stub = createRoutesStub([
    {
      Component: (): React.ReactElement => (
        <Index
          actionData={undefined}
          loaderData={loaderData}
          matches={matches}
          params={{}}
        />
      ),
      path: '/',
    },
  ]);

  return render(
    <TooltipProvider>
      <Stub initialEntries={[entry]} />
    </TooltipProvider>,
  );
};

describe('routes/_index.tsx deep-link (?conversationId=)', () => {
  beforeEach(() => {
    hoisted.restoreSpy.mockClear();
    hoisted.resetSpy.mockClear();
  });

  test('restores the conversation once on mount', async () => {
    renderAt('/?conversationId=abc');

    await waitFor(() => {
      expect(hoisted.restoreSpy).toHaveBeenCalledWith({
        conversationId: 'abc',
      });
    });
    expect(hoisted.restoreSpy).toHaveBeenCalledTimes(1);
  });

  test('does not restore when no conversationId param is present', async () => {
    const component = renderAt('/');

    // Let the mount effects flush (the hero shell is synchronous).
    await waitFor(() => {
      expect(
        component.getByText('What would you like to build today?'),
      ).toBeInTheDocument();
    });
    expect(hoisted.restoreSpy).not.toHaveBeenCalled();
  });
});
