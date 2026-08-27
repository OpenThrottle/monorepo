import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Provider, createStore, useAtomValue } from 'jotai';
import { describe, expect, test } from 'vitest';
import { PlanRunConfigRepositoriesHydrator } from '../PlanRunConfigRepositoriesHydrator';
import type { PlanRunConfigRepositoriesHydratorProps } from '../PlanRunConfigRepositoriesHydrator';
import {
  workflowBranchAtom,
  workflowBranchDirtyAtom,
  workflowCheckoutIdAtom,
  workspaceRepositoriesReadyAtom,
} from '~/routing/plans/data/atom.plan';
import { FALLBACK_RUN_BRANCH } from '~/routing/plans/utils/plan-run-branch';

const CHECKOUT_ID = '11111111-1111-4111-8111-111111111111';

/** Overloaded identity helper to launder a loose seed as the generated type. */
function asRepositories(
  value: unknown,
): Awaited<PlanRunConfigRepositoriesHydratorProps['repositories']>;
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
]);

interface HarnessProps {
  readonly repositories: PlanRunConfigRepositoriesHydratorProps['repositories'];
  readonly store: ReturnType<typeof createStore>;
}

/**
 * Renders the hydrator against a seeded store, plus a probe for the atoms it
 * writes and a button that dirties the branch the way the user typing does.
 */
const Harness = (props: HarnessProps): React.ReactElement => {
  const { repositories: promise, store } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Provider store={store}>
      <PlanRunConfigRepositoriesHydrator repositories={promise} />
      <Probe />
    </Provider>
  );
};

// eslint-disable-next-line react/no-multi-comp
function Probe(): React.ReactElement {
  const branch = useAtomValue(workflowBranchAtom);
  const ready = useAtomValue(workspaceRepositoriesReadyAtom);

  return (
    <>
      <span data-testid="branch">{branch}</span>
      <span data-testid="ready">{String(ready)}</span>
    </>
  );
}

const seedStore = (options: {
  readonly branch: string;
  readonly dirty: boolean;
}): ReturnType<typeof createStore> => {
  const store = createStore();
  store.set(workflowCheckoutIdAtom, CHECKOUT_ID);
  store.set(workflowBranchAtom, options.branch);
  store.set(workflowBranchDirtyAtom, options.dirty);

  return store;
};

describe('PlanRunConfigRepositoriesHydrator Component', () => {
  test('back-fills a pristine branch once repositories resolve', async () => {
    const store = seedStore({ branch: FALLBACK_RUN_BRANCH, dirty: false });
    const component = render(
      <Harness repositories={Promise.resolve(repositories)} store={store} />,
    );

    expect(component.getByTestId('branch')).toHaveTextContent(
      FALLBACK_RUN_BRANCH,
    );

    await waitFor(() =>
      expect(component.getByTestId('branch')).toHaveTextContent('feature/x'),
    );
  });

  // 🚨 The failure mode this component exists to make impossible.
  test('never overwrites a branch the user typed', async () => {
    const store = seedStore({ branch: 'my-typed-branch', dirty: true });
    const component = render(
      <Harness repositories={Promise.resolve(repositories)} store={store} />,
    );

    // Wait for the promise to settle, so this is a real assertion about the
    // resolved state rather than about timing.
    await waitFor(() =>
      expect(component.getByTestId('ready')).toHaveTextContent('true'),
    );

    expect(component.getByTestId('branch')).toHaveTextContent(
      'my-typed-branch',
    );
  });

  test('marks the workspace ready only after the promise resolves', async () => {
    const pending = seedStore({ branch: FALLBACK_RUN_BRANCH, dirty: false });
    const pendingComponent = render(
      <Harness repositories={new Promise(() => {})} store={pending} />,
    );

    expect(pendingComponent.getByTestId('ready')).toHaveTextContent('false');
    pendingComponent.unmount();

    const settled = seedStore({ branch: FALLBACK_RUN_BRANCH, dirty: false });
    const settledComponent = render(
      <Harness repositories={Promise.resolve(repositories)} store={settled} />,
    );

    await waitFor(() =>
      expect(settledComponent.getByTestId('ready')).toHaveTextContent('true'),
    );
  });

  test('resolving to no repositories still marks the workspace ready', async () => {
    const store = seedStore({ branch: FALLBACK_RUN_BRANCH, dirty: false });
    const component = render(
      <Harness
        repositories={Promise.resolve(asRepositories([]))}
        store={store}
      />,
    );

    // An empty workspace is a resolved answer, not a permanent loading state —
    // otherwise Run would stay disabled forever for a user with no repositories.
    await waitFor(() =>
      expect(component.getByTestId('ready')).toHaveTextContent('true'),
    );
    expect(component.getByTestId('branch')).toHaveTextContent(
      FALLBACK_RUN_BRANCH,
    );
  });
});
