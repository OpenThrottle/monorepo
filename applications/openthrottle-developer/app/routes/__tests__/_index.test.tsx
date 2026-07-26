import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ChatComposerMode } from '@openthrottle/react-router-chat';
import { getDefaultStore } from 'jotai';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '~/routing/home/data/atom.chat-toolbar';
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
      { description: 'Agent CLI', groupId: 'agent-clis', id: 'cursor', label: 'Cursor' }, // prettier-ignore
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

  test('mode toggle reflects the persisted atom state', () => {
    store.set(chatToolbarStateAtom, {
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      mode: ChatComposerMode.build,
    });

    const component = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={seededLoaderData}
        matches={matches}
        params={{}}
      />,
    );

    // The toggle items are radios; the tooltip trigger clobbers `data-state`,
    // so the pressed state is read from `aria-checked`.
    expect(
      component.getByTestId('ChatComposerToolbar-mode-build'),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      component.getByTestId('ChatComposerToolbar-mode-plan'),
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('changing the mode control persists only that field to the atom', async () => {
    // Default is Plan; toggling to Build must write through the per-field setter.
    const user = userEvent.setup();
    const component = renderRoutesStub(
      <Index
        actionData={undefined}
        loaderData={seededLoaderData}
        matches={matches}
        params={{}}
      />,
    );

    expect(store.get(chatToolbarStateAtom).mode).toBe(ChatComposerMode.plan);

    await user.click(component.getByTestId('ChatComposerToolbar-mode-build'));

    // Only `mode` changed; every other persisted field kept its default.
    expect(store.get(chatToolbarStateAtom)).toEqual({
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      mode: ChatComposerMode.build,
    });
  });
});
