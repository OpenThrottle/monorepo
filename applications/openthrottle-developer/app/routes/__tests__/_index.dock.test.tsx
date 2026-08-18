import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../_index';
import type { Route } from '@/app/routes/+types/_index';

// A long thread is the whole point of docking, and `messages` lives in client
// state rather than the loader — so stub the turn hook to hand the route one.
// Scoped to this file; the other _index tests exercise the real hooks.
const hoisted = vi.hoisted(() => ({
  messages: Array.from({ length: 40 }, (_index, position) => ({
    body: `message ${position}`,
    id: `message-${position}`,
    role: position % 2 === 0 ? 'user' : 'assistant',
  })),
}));

vi.mock('~/routing/home/hooks/useAgenticChatTurn', () => ({
  useAgenticChatTurn: () => ({
    canRetry: false,
    conversationId: 'conversation-1',
    error: null,
    isStreaming: false,
    messages: hoisted.messages,
    onRetry: vi.fn(),
    onStop: vi.fn(),
    reset: vi.fn(),
    restore: vi.fn(),
    sessionUsage: {},
    setError: vi.fn(),
    submitTurn: vi.fn(),
  }),
}));

vi.mock('~/routing/home/hooks/useConversationList', () => ({
  useConversationList: () => ({
    conversations: [],
    isLoading: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    remove: vi.fn(),
    rename: vi.fn(),
    totalCount: 0,
  }),
}));

const buildMatches = (
  loaderData: Route.ComponentProps['loaderData'],
): Route.ComponentProps['matches'] => [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData,
    params: {},
    pathname: '/',
  },
];

const renderHome = (
  loaderData: Route.ComponentProps['loaderData'],
): RenderResult => {
  const Stub = createRoutesStub([
    {
      Component: (): React.ReactElement => (
        <Index
          actionData={undefined}
          loaderData={loaderData}
          matches={buildMatches(loaderData)}
          params={{}}
        />
      ),
      path: '/',
    },
  ]);

  return render(
    <TooltipProvider>
      <Stub />
    </TooltipProvider>,
  );
};

const resolvedComposerData = (): Route.ComponentProps['loaderData'] => ({
  composerData: Promise.resolve({
    models: [],
    personas: [],
    repositories: [],
  }),
});

// A never-resolving promise holds the Suspense boundary in its fallback.
const pendingComposerData = (): Route.ComponentProps['loaderData'] => ({
  composerData: new Promise<never>(() => {}),
});

describe('routes/_index.tsx docked composer', () => {
  test('docks the composer region against the page scroll container', async () => {
    const component = renderHome(resolvedComposerData());
    const dock = await component.findByTestId('HomeComposerDock');

    expect(dock).toHaveClass('sticky');
    expect(dock).toHaveClass('bottom-0');
    expect(dock).toHaveClass('bg-background');
    expect(dock).toHaveClass('pb-[env(safe-area-inset-bottom)]');
  });

  test('docks on mobile too — the sticky classes carry no md: gate', async () => {
    const component = renderHome(resolvedComposerData());
    const dock = await component.findByTestId('HomeComposerDock');

    expect(dock.className).not.toMatch(/md:/);
  });

  test('keeps the composer outside the scrollable thread, as its sibling', async () => {
    const component = renderHome(resolvedComposerData());
    const dock = await component.findByTestId('HomeComposerDock');
    const thread = component.getByTestId('ChatThread');

    // Nested inside the thread, the composer would scroll with the messages —
    // the exact bug this plan fixes. Siblings under one parent instead.
    expect(thread.contains(dock)).toBe(false);
    expect(dock.parentElement).toBe(thread.parentElement);
  });

  test('renders a long thread with the composer still present', async () => {
    const component = renderHome(resolvedComposerData());

    await component.findByTestId('ChatComposer');
    expect(component.getByText('message 0')).toBeInTheDocument();
    expect(component.getByText('message 39')).toBeInTheDocument();
  });

  test('hides the empty-state hero once the thread has messages', async () => {
    const component = renderHome(resolvedComposerData());

    // Await the deferred composer so the suspended resource settles inside the
    // test rather than after it (which React reports as an act() warning).
    await component.findByTestId('ChatComposer');

    expect(
      component.queryByText('What would you like to build today?'),
    ).not.toBeInTheDocument();
  });

  test('renders the Suspense fallback inside the same dock', async () => {
    const component = renderHome(pendingComposerData());

    await waitFor(() => {
      expect(component.getByTestId('HomeComposerSkeleton')).toBeInTheDocument();
    });

    const dock = component.getByTestId('HomeComposerDock');

    // Same frame for skeleton and composer, so models landing shifts nothing.
    expect(dock.contains(component.getByTestId('HomeComposerSkeleton'))).toBe(
      true,
    );
    expect(component.queryByTestId('ChatComposer')).not.toBeInTheDocument();
  });

  test('keeps the thread mounted while the composer is still streaming in', () => {
    const component = renderHome(pendingComposerData());

    // The thread sits outside the <Await>, so it paints with the shell rather
    // than waiting on model discovery.
    expect(component.getByTestId('ChatThread')).toBeInTheDocument();
    expect(component.getByText('message 0')).toBeInTheDocument();
  });
});
