import * as React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  workflowBranchAtom,
  workflowBranchDirtyAtom,
  workflowCheckoutIdAtom,
  workflowRepositoryIdAtom,
  workspaceRepositoriesReadyAtom,
} from '~/routing/plans/data/atom.plan';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import { resolveDefaultRunBranch } from '~/routing/plans/utils/plan-run-branch';

export interface PlanRunConfigRepositoriesHydratorProps {
  readonly repositories: Promise<
    readonly PlanRunConfigRepositoryFieldsFragment[]
  >;
}

/**
 * @description Back-fills the run branch once the deferred `workspaceRepositories`
 * promise resolves, and flips {@link workspaceRepositoriesReadyAtom}.
 *
 * `PlanRunConfigStoreProvider` must seed a branch at mount — it is a required
 * enqueue input — but with repositories deferred it can only seed the fallback.
 * This component re-runs the same resolver with the real repositories and writes
 * the better answer, **only while the branch is still pristine**. A branch the
 * user typed is never overwritten.
 *
 * Renders nothing: it exists purely to bridge a deferred loader key into the
 * route-scoped store, so it must live inside the Provider.
 */
export const PlanRunConfigRepositoriesHydrator = (
  props: PlanRunConfigRepositoriesHydratorProps,
): React.ReactElement | null => {
  const { repositories } = props;

  // Hooks
  const resolved = usePlanDeferredValue(repositories);
  const branchDirty = useAtomValue(workflowBranchDirtyAtom);
  const checkoutId = useAtomValue(workflowCheckoutIdAtom);
  const repositoryId = useAtomValue(workflowRepositoryIdAtom);
  const setBranch = useSetAtom(workflowBranchAtom);
  const setReady = useSetAtom(workspaceRepositoriesReadyAtom);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (resolved === undefined) return;

    setReady(true);

    // 🚨 Never clobber a branch the user typed.
    if (branchDirty) return;

    setBranch(
      resolveDefaultRunBranch({
        checkoutId,
        repositories: resolved,
        repositoryId,
      }),
    );
    // `branchDirty` is deliberately not a dependency: this should re-resolve when
    // the repositories or the selected workspace change, not at the moment the
    // user first touches the branch input.
  }, [checkoutId, repositoryId, resolved, setBranch, setReady]);

  // 🔌 Short Circuit

  return null;
};
