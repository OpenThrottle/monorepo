import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { useNavigation } from 'react-router';

import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import {
  REMOVE_PLAN_RUN_WORKTREE_COPY,
  REPOSITORIES_ROW_ACTIONS_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckout } from '~/routing/settings/repositories/types';
import { REMOVE_PLAN_RUN_WORKTREE_INTENT } from '~/routing/settings/repositories/utils/missing-rows';

/** The worktree on disk behind a checkout the server says is safe to remove. */
export interface RemovableWorktree {
  branch: string | null;
  path: string;
}

export interface RepositoryCheckoutActionsProps {
  checkout: RepositoryCheckout;
  className?: string;
  /** Set only for a plan-run worktree whose teardown guards pass; adds "Remove worktree". */
  removableWorktree: RemovableWorktree | null;
}

/**
 * @description The actions menu for a registered checkout that is present on disk:
 * refresh, apply editor config, and remove (behind a confirmation). Split out of
 * RepositoryRowActions, which routes the other row shapes.
 */
export const RepositoryCheckoutActions = (
  props: RepositoryCheckoutActionsProps,
): React.ReactElement => {
  const { checkout, className, removableWorktree } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const isRefreshing =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'refreshCheckout' &&
    navigation.formData.get('id') === checkout.id;

  const removeWorktreeActions: GlobalPopoverAction[] = [];
  if (removableWorktree !== null) {
    removeWorktreeActions.push({
      confirm: {
        cancelLabel: REPOSITORIES_ROW_ACTIONS_COPY.cancelButton,
        confirmLabel: REMOVE_PLAN_RUN_WORKTREE_COPY.confirm,
        description: (
          <>
            {REMOVE_PLAN_RUN_WORKTREE_COPY.descriptionPrefix}{' '}
            <code className="break-all">{removableWorktree.path}</code>{' '}
            {REMOVE_PLAN_RUN_WORKTREE_COPY.descriptionSuffix}{' '}
            {REMOVE_PLAN_RUN_WORKTREE_COPY.descriptionBranch(
              removableWorktree.branch,
            )}
          </>
        ),
        title: REMOVE_PLAN_RUN_WORKTREE_COPY.title,
      },
      destructive: true,
      fields: {
        checkoutId: checkout.id,
        intent: REMOVE_PLAN_RUN_WORKTREE_INTENT,
      },
      id: 'removePlanRunWorktree',
      kind: 'submit',
      label: REMOVE_PLAN_RUN_WORKTREE_COPY.label,
      separatorBefore: true,
    });
  }

  const actions: GlobalPopoverAction[] = [
    {
      fields: { id: checkout.id, intent: 'refreshCheckout' },
      id: 'refreshCheckout',
      kind: 'submit',
      label: WORKSPACE_FOLDERS_COPY.refreshButton,
      pending: isRefreshing,
      pendingLabel: REPOSITORIES_ROW_ACTIONS_COPY.refreshingLabel,
    },
    {
      fields: {
        intent: 'applyEditorConfig',
        repositoryId: checkout.id,
      },
      id: 'applyEditorConfig',
      kind: 'submit',
      label: WORKSPACE_FOLDERS_COPY.applyEditorConfigButton,
    },
    ...removeWorktreeActions,
    {
      confirm: {
        cancelLabel: REPOSITORIES_ROW_ACTIONS_COPY.cancelButton,
        confirmLabel: REPOSITORIES_ROW_ACTIONS_COPY.removeConfirmButton,
        description: (
          <>
            {REPOSITORIES_ROW_ACTIONS_COPY.removeDescriptionPrefix}{' '}
            <span className="font-medium">{checkout.displayName}</span>{' '}
            {REPOSITORIES_ROW_ACTIONS_COPY.removeDescriptionSuffix}
          </>
        ),
        title: REPOSITORIES_ROW_ACTIONS_COPY.removeTitle,
      },
      destructive: true,
      fields: { id: checkout.id, intent: 'deleteRepo' },
      id: 'deleteRepo',
      kind: 'submit',
      label: WORKSPACE_FOLDERS_COPY.removeButton,
      separatorBefore: removeWorktreeActions.length === 0,
    },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={`${REPOSITORIES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${checkout.displayName}`}
      className={className}
      testId={`RepositoryRowActions-${checkout.id}`}
    />
  );
};
