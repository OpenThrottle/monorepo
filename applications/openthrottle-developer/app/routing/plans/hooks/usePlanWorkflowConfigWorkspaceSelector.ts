/**
 * @description Selection state + behavior for
 * {@link PlanWorkflowConfigWorkspaceSelector}: derives the encoded select value
 * from the checkoutId → repositoryId → workingDirectory precedence, resolves
 * the selected checkout, dispatches select changes back to the three
 * run-config setters, and pre-fills a single-checkout project repository once.
 */
import * as React from 'react';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  CHECKOUT_PREFIX,
  CUSTOM_VALUE,
  REPOSITORY_PREFIX,
  ROOT_VALUE,
} from '~/routing/plans/utils/plan-workflow-config-workspace-selector';

export interface PlanWorkflowConfigWorkspaceSelectorOptions {
  readonly checkoutId: string;
  readonly onCheckoutIdChange: (checkoutId: string) => void;
  readonly onRepositoryIdChange: (repositoryId: string) => void;
  readonly onWorkingDirectoryChange: (path: string) => void;
  readonly planProjectId?: string | null;
  readonly repositories: readonly PlanRunConfigRepositoryFieldsFragment[];
  readonly repositoryId: string;
  readonly workingDirectory: string;
}

export interface UsePlanWorkflowConfigWorkspaceSelectorResult {
  readonly handleValueChange: (value: string) => void;
  readonly selectedCheckout:
    | PlanRunConfigRepositoryFieldsFragment['checkouts'][number]
    | undefined;
  readonly selectedValue: string;
}

export const usePlanWorkflowConfigWorkspaceSelector = (
  options: PlanWorkflowConfigWorkspaceSelectorOptions,
): UsePlanWorkflowConfigWorkspaceSelectorResult => {
  const {
    checkoutId,
    onCheckoutIdChange,
    onRepositoryIdChange,
    onWorkingDirectoryChange,
    planProjectId,
    repositories,
    repositoryId,
    workingDirectory,
  } = options;

  // Hooks
  const prefilledRef = React.useRef(false);

  // Setup
  const selectedValue =
    checkoutId !== ''
      ? `${CHECKOUT_PREFIX}${checkoutId}`
      : repositoryId !== ''
        ? `${REPOSITORY_PREFIX}${repositoryId}`
        : workingDirectory.trim() !== ''
          ? CUSTOM_VALUE
          : ROOT_VALUE;

  const selectedCheckout = React.useMemo(() => {
    if (checkoutId === '') return undefined;
    for (const repo of repositories) {
      const match = repo.checkouts.find(
        (checkout) => checkout.id === checkoutId,
      );
      if (match) return match;
    }
    return undefined;
  }, [checkoutId, repositories]);

  // Handlers
  const handleValueChange = (value: string): void => {
    if (value === ROOT_VALUE) {
      onCheckoutIdChange('');
      onRepositoryIdChange('');
      onWorkingDirectoryChange('');
      return;
    }
    if (value === CUSTOM_VALUE) {
      onCheckoutIdChange('');
      onRepositoryIdChange('');
      return;
    }
    if (value.startsWith(CHECKOUT_PREFIX)) {
      onCheckoutIdChange(value.slice(CHECKOUT_PREFIX.length));
      onRepositoryIdChange('');
      onWorkingDirectoryChange('');
      return;
    }
    if (value.startsWith(REPOSITORY_PREFIX)) {
      onRepositoryIdChange(value.slice(REPOSITORY_PREFIX.length));
      onCheckoutIdChange('');
      onWorkingDirectoryChange('');
    }
  };

  // Markup

  // Life Cycle
  // Pre-fill (once): when nothing is selected and the plan's project maps to a
  // single repository that has exactly one checkout, default to that repositoryId.
  React.useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;

    const nothingSelected =
      checkoutId === '' &&
      repositoryId === '' &&
      workingDirectory.trim() === '';
    if (!nothingSelected || planProjectId == null || planProjectId === '') {
      return;
    }

    const projectRepos = repositories.filter(
      (repo) => repo.projectId === planProjectId,
    );
    const only = projectRepos.length === 1 ? projectRepos[0] : undefined;
    if (only && only.checkouts.length === 1) {
      onRepositoryIdChange(only.id);
    }
  }, [
    checkoutId,
    onRepositoryIdChange,
    planProjectId,
    repositories,
    repositoryId,
    workingDirectory,
  ]);

  // 🔌 Short Circuit

  return {
    handleValueChange,
    selectedCheckout,
    selectedValue,
  };
};
