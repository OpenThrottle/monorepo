import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { useNavigation } from 'react-router';

import { RepositoryCheckoutActions } from '~/routing/settings/repositories/components/RepositoryCheckoutActions';
import {
  MISSING_WORKTREES_COPY,
  REPOSITORIES_ROW_ACTIONS_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/types';
import { PRUNE_WORKTREE_CHECKOUTS_INTENT } from '~/routing/settings/repositories/utils/missing-rows';

export interface RepositoryRowActionsProps {
  className?: string;
  row: RepositoryCheckoutRow;
}

/**
 * @description Per-row actions menu. For a registered checkout: refresh, apply
 * editor config, and remove. For a worktree found on disk that OpenThrottle has no
 * record of, the single action is registration, which posts the SAME `addFolder`
 * intent the add-folder dialog posts — the registration pipeline already stamps
 * `kind='worktree'` off `snapshot.git.isLinkedWorktree`, so no new server write
 * exists for this. A registered
 * plan-run worktree the server reports safe to remove also gets "Remove worktree", which runs the
 * guarded teardown (branch kept); every other worktree directory is left alone.
 *
 * For a registered worktree the last scan reported missing from disk, refresh and
 * editor config have nothing to act on, so the single action is "Remove record" —
 * the same `pruneWorktreeCheckouts` intent the toolbar's bulk prune posts, for one id.
 *
 * For a registered checkout: Each item posts the same intent and hidden fields
 * the inline card buttons posted, so the route action is untouched — note that
 * `applyEditorConfig` deliberately still sends the CHECKOUT id under the name
 * `repositoryId`, matching the existing contract. Remove sits behind a
 * confirmation because it is destructive and now a click deeper in a menu.
 */
export const RepositoryRowActions = (
  props: RepositoryRowActionsProps,
): React.ReactElement => {
  const { className, row } = props;
  const { checkout } = row;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const removableWorktree = row.safeToRemove
    ? { branch: row.branch, path: row.path }
    : null;
  const isRegistering =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'addFolder' &&
    navigation.formData.get('path') === row.path;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (checkout !== null && row.missing) {
    return (
      <GlobalPopover
        actions={[
          {
            confirm: {
              cancelLabel: REPOSITORIES_ROW_ACTIONS_COPY.cancelButton,
              confirmLabel: MISSING_WORKTREES_COPY.removeRecordConfirm,
              description: (
                <>
                  {MISSING_WORKTREES_COPY.removeRecordDescriptionPrefix}{' '}
                  <span className="font-medium">{checkout.displayName}</span>{' '}
                  {MISSING_WORKTREES_COPY.removeRecordDescriptionSuffix}
                </>
              ),
              title: MISSING_WORKTREES_COPY.removeRecordTitle,
            },
            destructive: true,
            fields: {
              checkoutIds: checkout.id,
              intent: PRUNE_WORKTREE_CHECKOUTS_INTENT,
            },
            id: 'removeRecord',
            kind: 'submit',
            label: MISSING_WORKTREES_COPY.removeRecordLabel,
          },
        ]}
        ariaLabel={`${REPOSITORIES_ROW_ACTIONS_COPY.worktreeMenuAriaLabelPrefix} ${checkout.displayName}`}
        className={className}
        testId={`RepositoryRowActions-${checkout.id}`}
      />
    );
  }

  if (checkout === null) {
    return (
      <GlobalPopover
        actions={[
          {
            fields: { intent: 'addFolder', path: row.path },
            id: 'registerWorktree',
            kind: 'submit',
            label: REPOSITORIES_ROW_ACTIONS_COPY.registerWorktreeLabel,
            pending: isRegistering,
            pendingLabel:
              REPOSITORIES_ROW_ACTIONS_COPY.registeringWorktreeLabel,
          },
        ]}
        ariaLabel={`${REPOSITORIES_ROW_ACTIONS_COPY.worktreeMenuAriaLabelPrefix} ${row.displayName}`}
        className={className}
        testId={`RepositoryRowActions-${row.id}`}
      />
    );
  }

  return (
    <RepositoryCheckoutActions
      checkout={checkout}
      className={className}
      removableWorktree={removableWorktree}
    />
  );
};
