import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ChatComposerMode } from '@openthrottle/react-router-chat';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { createStore, getDefaultStore, Provider } from 'jotai';
import type { RenderResult } from '@testing-library/react';
import { renderRouteHarness } from '~/testing/route-fixtures';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../_index';
import type { Route } from '@/app/routes/+types/_index';

/**
 * Render the home route with a stub `/resources/agent-conversations` action so
 * the sidebar's mount-time conversation list fetch resolves (empty) instead of
 * 404-ing into the router error boundary.
 */
const renderHome = (element: React.ReactElement): RenderResult =>
  renderRouteHarness([
    { Component: (): React.ReactElement => element, path: '/' },
    {
      action: () => ({ conversations: [], errorMessage: null, totalCount: 0 }),
      path: '/resources/agent-conversations',
    },
  ]);

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData: {
      composerData: Promise.resolve({
        models: [],
        personas: [],
        repositories: [],
      }),
    },
    params: {},
    pathname: '/',
  },
];

describe('routes/_index.tsx', () => {
  test('renders the shell synchronously and streams the composer in', async () => {
    const view = renderHome(
      <Index
        actionData={undefined}
        loaderData={{
          composerData: Promise.resolve({
            models: [],
            personas: [],
            repositories: [],
          }),
        }}
        matches={matches}
        params={{}}
      />,
    );

    // Shell (hero) paints immediately — not blocked on the deferred composer.
    expect(
      view.getByText('What would you like to build today?'),
    ).toBeInTheDocument();

    // The composer streams in behind Suspense once composerData resolves; with
    // no models it renders disabled with the discovery hint.
    expect(await view.findByTestId('ChatComposer')).toBeInTheDocument();
    expect(
      await view.findByText(/No local models discovered/),
    ).toBeInTheDocument();
  });

  test('shows the disabled composer skeleton while composer data is pending', () => {
    const view = renderHome(
      <Index
        actionData={undefined}
        // A never-resolving promise keeps the Suspense boundary in its fallback.
        loaderData={{ composerData: new Promise<never>(() => {}) }}
        matches={matches}
        params={{}}
      />,
    );

    // Shell is present, and the fallback skeleton stands in for the composer.
    expect(
      view.getByText('What would you like to build today?'),
    ).toBeInTheDocument();
    expect(view.getByTestId('HomeComposerSkeleton')).toBeInTheDocument();
    expect(view.getByText('Discovering models…')).toBeInTheDocument();
    expect(view.queryByTestId('ChatComposer')).not.toBeInTheDocument();
  });
});

describe('routes/_index.tsx toolbar persistence', () => {
  // The home route reads/writes the persisted toolbar via `useAtom`, which —
  // absent a jotai Provider (renderRoutesStub wraps only TooltipProvider) —
  // resolves to jotai's default store. Seed and assert through that same store.
  const store = getDefaultStore();

  const seededLoaderData: Route.ComponentProps['loaderData'] = {
    composerData: Promise.resolve({
      models: [
        { description: 'cursor-agent', groupId: 'cursor', id: 'cursor', label: 'cursor-agent', subLabel: 'cursor-agent' }, // prettier-ignore
      ],
      personas: [{ id: 'p1', label: 'Persona One' }],
      repositories: [{ displayName: 'Repo One', id: 'r1' }],
    }),
  };

  beforeEach(() => {
    localStorage.clear();
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
  });

  afterEach(() => {
    localStorage.clear();
    store.set(chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE);
  });

  // A page reload = a fresh JS context whose atom re-reads localStorage via
  // `getOnInit`. A fresh jotai store (mounted over the route via a Provider)
  // reproduces that hydration path faithfully, so this stands in for the live
  // reload proof (the home route is auth-gated; see the task summary). The mode
  // toggle is no longer surfaced in the composer, so hydration is asserted on
  // the persisted atom directly rather than a rendered control.
  test('rehydrates the toolbar from localStorage on a fresh store (reload)', async () => {
    localStorage.setItem(
      CHAT_TOOLBAR_STORAGE_KEY,
      JSON.stringify({ mode: ChatComposerMode.build, version: 1 }),
    );
    const freshStore = createStore();

    const view = renderHome(
      <Provider store={freshStore}>
        <Index
          actionData={undefined}
          loaderData={seededLoaderData}
          matches={matches}
          params={{}}
        />
      </Provider>,
    );

    // Wait for the deferred composer (the atom consumer) to stream in.
    await view.findByTestId('ChatComposer');

    expect(freshStore.get(chatToolbarStateAtom).mode).toBe(
      ChatComposerMode.build,
    );
  });

  test('falls back cleanly when persisted state references removed options', async () => {
    localStorage.setItem(
      CHAT_TOOLBAR_STORAGE_KEY,
      JSON.stringify({
        modelId: 'ghost-endpoint::model',
        personaId: 'ghost-persona',
        repositoryId: 'ghost-repo',
        version: 1,
      }),
    );
    const freshStore = createStore();

    const component = renderHome(
      <Provider store={freshStore}>
        <Index
          actionData={undefined}
          loaderData={seededLoaderData}
          matches={matches}
          params={{}}
        />
      </Provider>,
    );

    // Shell renders immediately despite the stale ids...
    expect(
      component.getByText('What would you like to build today?'),
    ).toBeInTheDocument();

    // ...and once the composer streams in and reconciliation runs, it is
    // derive-only: the stale blob is NOT rewritten to storage.
    await component.findByTestId('ChatComposer');
    const stored: { modelId: string } = JSON.parse(
      localStorage.getItem(CHAT_TOOLBAR_STORAGE_KEY) ?? '{}',
    );
    expect(stored.modelId).toBe('ghost-endpoint::model');
  });
});
