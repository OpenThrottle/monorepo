import * as React from 'react';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { useNavigation } from 'react-router';
import { REPOSITORIES_ROW_ACTIONS_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

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
 * exists for this. Nothing here removes or prunes a worktree: destructive worktree
 * removal is deliberately out of scope.
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
  const isRefreshing =
    checkout !== null &&
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'refreshCheckout' &&
    navigation.formData.get('id') === checkout.id;

  const isRegistering =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'addFolder' &&
    navigation.formData.get('path') === row.path;

  const actions: GlobalPopoverAction[] =
    checkout === null
      ? []
      : [
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
            separatorBefore: true,
          },
        ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
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
    <GlobalPopover
      actions={actions}
      ariaLabel={`${REPOSITORIES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${checkout.displayName}`}
      className={className}
      testId={`RepositoryRowActions-${checkout.id}`}
    />
  );
};
