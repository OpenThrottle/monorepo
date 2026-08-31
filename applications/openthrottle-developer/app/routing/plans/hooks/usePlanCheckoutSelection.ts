/**
 * @description Turns a pick in {@link PlanCheckoutSelector} into a durable plan
 * workspace association: writes the run-config atoms and then persists them via
 * `runConfigJson`, so the choice survives a reload rather than living only in
 * the route-scoped Jotai store.
 *
 * Must be called inside `PlanRunConfigStoreProvider`.
 */
import * as React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  workflowBranchAtom,
  workflowBranchDirtyAtom,
  workflowCheckoutIdAtom,
  workflowRepositoryIdAtom,
  workflowWorkingDirectoryAtom,
} from '~/routing/plans/data/atom.plan';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';
import { resolveDefaultRunBranch } from '~/routing/plans/utils/plan-run-branch';

export interface UsePlanCheckoutSelectionOptions {
  /** The route's run-config save; submits the serialized `runConfigJson`. */
  readonly onSaveRunConfig: () => void;
  readonly repositories: Promise<
    readonly PlanRunConfigRepositoryFieldsFragment[]
  >;
}

export interface UsePlanCheckoutSelectionResult {
  readonly checkoutId: string;
  readonly onCheckoutChange: (checkoutId: string) => void;
}

export const usePlanCheckoutSelection = (
  options: UsePlanCheckoutSelectionOptions,
): UsePlanCheckoutSelectionResult => {
  const { onSaveRunConfig, repositories } = options;

  // Hooks
  const resolved = usePlanDeferredValue(repositories);
  const branchDirty = useAtomValue(workflowBranchDirtyAtom);
  const checkoutId = useAtomValue(workflowCheckoutIdAtom);
  const setBranch = useSetAtom(workflowBranchAtom);
  const setCheckoutId = useSetAtom(workflowCheckoutIdAtom);
  const setRepositoryId = useSetAtom(workflowRepositoryIdAtom);
  const setWorkingDirectory = useSetAtom(workflowWorkingDirectoryAtom);
  const [saveQueued, setSaveQueued] = React.useState(false);

  // Setup

  // Handlers
  const onCheckoutChange = (nextCheckoutId: string): void => {
    const repositories = resolved ?? [];
    const repositoryId =
      repositories.find((repository) =>
        repository.checkouts.some((checkout) => checkout.id === nextCheckoutId),
      )?.id ?? '';

    setCheckoutId(nextCheckoutId);
    // Carried alongside the checkout so a run enqueued by another user — who
    // has their own checkout of the same repository — still resolves a path.
    setRepositoryId(repositoryId);
    // A checkout outranks a custom path on enqueue, so leaving a stale path
    // behind would make the saved config claim two different workspaces.
    setWorkingDirectory('');

    // 🚨 Never clobber a branch the user typed. Branch is a REQUIRED enqueue
    // input, so pre-filling it here is what actually un-blocks Run/Queue.
    if (!branchDirty) {
      setBranch(
        resolveDefaultRunBranch({
          checkoutId: nextCheckoutId,
          repositories,
          repositoryId,
        }),
      );
    }

    setSaveQueued(true);
  };

  // Life Cycle
  // 🚨 `onSaveRunConfig` closes over `runConfigJsonAtom` as of the CURRENT
  // render, which still holds the pre-selection workspace. Saving inline would
  // durably persist the previous choice. Deferring by one commit means the
  // closure we invoke serializes the atoms written above.
  React.useEffect(() => {
    if (!saveQueued) return;

    setSaveQueued(false);
    onSaveRunConfig();
  }, [onSaveRunConfig, saveQueued]);

  // 🔌 Short Circuit

  return { checkoutId, onCheckoutChange };
};
