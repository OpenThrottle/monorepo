import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ChatComposerMode } from '@openthrottle/react-router-chat';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '@openthrottle/react-router-chat-state';
import { createStore, getDefaultStore, Provider } from 'jotai';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../_index';
import type { Route } from '@/app/routes/+types/_index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/_index',
    loaderData: { models: [], personas: [], repositories: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/_index.tsx', () => {
  test('renders home build prompt heading', () => {
    const view = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={{ models: [], personas: [], repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(
      view.getByText('What would you like to build today?'),
    ).toBeInTheDocument();
  });
});

describe('routes/_index.tsx toolbar persistence', () => {
  // The home route reads/writes the persisted toolbar via `useAtom`, which —
  // absent a jotai Provider (renderRoutesStub wraps only TooltipProvider) —
  // resolves to jotai's default store. Seed and assert through that same store.
  const store = getDefaultStore();

  const seededLoaderData: Route.ComponentProps['loaderData'] = {
    models: [
      { description: 'cursor-agent', groupId: 'cursor', id: 'cursor', label: 'cursor-agent', subLabel: 'cursor-agent' }, // prettier-ignore
    ],
    personas: [{ id: 'p1', label: 'Persona One' }],
    repositories: [{ displayName: 'Repo One', id: 'r1' }],
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
  test('rehydrates the toolbar from localStorage on a fresh store (reload)', () => {
    localStorage.setItem(
      CHAT_TOOLBAR_STORAGE_KEY,
      JSON.stringify({ mode: ChatComposerMode.build, version: 1 }),
    );
    const freshStore = createStore();

    renderRoutesStub(
      <Provider store={freshStore}>
        <Index
          actionData={undefined}
          loaderData={seededLoaderData}
          matches={matches}
          params={{}}
        />
      </Provider>,
    );

    expect(freshStore.get(chatToolbarStateAtom).mode).toBe(
      ChatComposerMode.build,
    );
  });

  test('falls back cleanly when persisted state references removed options', () => {
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

    const component = renderRoutesStub(
      <Provider store={freshStore}>
        <Index
          actionData={undefined}
          loaderData={seededLoaderData}
          matches={matches}
          params={{}}
        />
      </Provider>,
    );

    // Renders without crashing despite the stale ids...
    expect(
      component.getByText('What would you like to build today?'),
    ).toBeInTheDocument();

    // ...and reconciliation is derive-only: the stale blob is NOT rewritten.
    const stored: { modelId: string } = JSON.parse(
      localStorage.getItem(CHAT_TOOLBAR_STORAGE_KEY) ?? '{}',
    );
    expect(stored.modelId).toBe('ghost-endpoint::model');
  });
});
