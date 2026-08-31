import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { describe, expect, test, vi } from 'vitest';
import { usePlanCheckoutSelection } from '../usePlanCheckoutSelection';
import type { UsePlanCheckoutSelectionOptions } from '../usePlanCheckoutSelection';
import {
  workflowBranchAtom,
  workflowBranchDirtyAtom,
  workflowCheckoutIdAtom,
  workflowRepositoryIdAtom,
  workflowWorkingDirectoryAtom,
} from '~/routing/plans/data/atom.plan';

const CHECKOUT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CHECKOUT_ID = '22222222-2222-4222-8222-222222222222';

/** Overloaded identity helper to launder a loose seed as the generated type. */
function asRepositories(
  value: unknown,
): Awaited<UsePlanCheckoutSelectionOptions['repositories']>;
function asRepositories(value: unknown): unknown {
  return value;
}

const repositories = asRepositories([
  {
    checkouts: [
      {
        displayName: 'monorepo',
        filesystemPath: '/Users/me/monorepo',
        id: CHECKOUT_ID,
        inspection: {
          git: { currentBranch: 'feature/x', defaultBranch: null },
        },
        kind: 'primary',
        managed: false,
      },
    ],
    defaultBranch: 'trunk',
    id: 'repo-1',
    name: 'monorepo',
    normalizedRemoteUrl: null,
    projectId: null,
  },
  {
    checkouts: [
      {
        displayName: 'website',
        filesystemPath: '/Users/me/website',
        id: OTHER_CHECKOUT_ID,
        inspection: { git: { currentBranch: 'main', defaultBranch: 'main' } },
        kind: 'primary',
        managed: false,
      },
    ],
    defaultBranch: null,
    id: 'repo-2',
    name: 'website',
    normalizedRemoteUrl: null,
    projectId: null,
  },
]);

const renderSelection = (
  options: {
    readonly branch?: string;
    readonly dirty?: boolean;
    readonly onSaveRunConfig?: () => void;
    /** Pass one in to read atoms from inside `onSaveRunConfig`. */
    readonly store?: ReturnType<typeof createStore>;
    readonly workingDirectory?: string;
  } = {},
) => {
  const store = options.store ?? createStore();
  store.set(workflowBranchAtom, options.branch ?? '');
  store.set(workflowBranchDirtyAtom, options.dirty ?? false);
  store.set(workflowWorkingDirectoryAtom, options.workingDirectory ?? '');

  const onSaveRunConfig = options.onSaveRunConfig ?? vi.fn();
  const wrapper = ({
    children,
  }: {
    readonly children: React.ReactNode;
  }): React.ReactElement => <Provider store={store}>{children}</Provider>;

  const rendered = renderHook(
    () =>
      usePlanCheckoutSelection({
        onSaveRunConfig,
        repositories: Promise.resolve(repositories),
      }),
    { wrapper },
  );

  return { onSaveRunConfig, rendered, store };
};

/**
 * `usePlanDeferredValue` resolves through an effect + state, so the repositories
 * are absent for the first commit. Every test picks a checkout only after this
 * flush — a pick before the list lands is not a case the UI can produce, since
 * the selector itself renders behind the same boundary.
 */
const flushRepositories = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('usePlanCheckoutSelection', () => {
  test('records the checkout and its parent repository', async () => {
    const { rendered, store } = renderSelection();

    await flushRepositories();
    act(() => rendered.result.current.onCheckoutChange(OTHER_CHECKOUT_ID));

    await waitFor(() =>
      expect(store.get(workflowCheckoutIdAtom)).toBe(OTHER_CHECKOUT_ID),
    );
    expect(store.get(workflowRepositoryIdAtom)).toBe('repo-2');
  });

  test('clears a custom working directory the checkout would outrank', async () => {
    const { rendered, store } = renderSelection({
      workingDirectory: '/Users/me/somewhere-else',
    });

    await flushRepositories();
    act(() => rendered.result.current.onCheckoutChange(CHECKOUT_ID));

    await waitFor(() =>
      expect(store.get(workflowWorkingDirectoryAtom)).toBe(''),
    );
  });

  test('pre-fills the required run branch from the picked checkout', async () => {
    const { rendered, store } = renderSelection();

    await flushRepositories();
    act(() => rendered.result.current.onCheckoutChange(CHECKOUT_ID));

    await waitFor(() =>
      expect(store.get(workflowBranchAtom)).toBe('feature/x'),
    );
  });

  // 🚨 The failure mode the dirty flag exists to make impossible.
  test('never overwrites a branch the user typed', async () => {
    const { onSaveRunConfig, rendered, store } = renderSelection({
      branch: 'my-typed-branch',
      dirty: true,
    });

    await flushRepositories();
    act(() => rendered.result.current.onCheckoutChange(CHECKOUT_ID));

    await waitFor(() => expect(onSaveRunConfig).toHaveBeenCalled());
    expect(store.get(workflowBranchAtom)).toBe('my-typed-branch');
  });

  // 🚨 Saving inline would serialize the PREVIOUS workspace, durably persisting
  // the wrong association. The save must observe the atoms just written.
  test('persists only after the run-config atoms are committed', async () => {
    const observed: string[] = [];
    const store = createStore();
    const onSaveRunConfig = vi.fn(() => {
      observed.push(store.get(workflowCheckoutIdAtom));
    });

    const { rendered } = renderSelection({ onSaveRunConfig, store });

    await flushRepositories();
    act(() => rendered.result.current.onCheckoutChange(CHECKOUT_ID));

    await waitFor(() => expect(onSaveRunConfig).toHaveBeenCalledTimes(1));
    expect(observed).toEqual([CHECKOUT_ID]);
  });

  test('reports the checkout currently on the run config', async () => {
    const { rendered } = renderSelection();

    await flushRepositories();
    expect(rendered.result.current.checkoutId).toBe('');
    act(() => rendered.result.current.onCheckoutChange(CHECKOUT_ID));

    await waitFor(() =>
      expect(rendered.result.current.checkoutId).toBe(CHECKOUT_ID),
    );
  });
});
