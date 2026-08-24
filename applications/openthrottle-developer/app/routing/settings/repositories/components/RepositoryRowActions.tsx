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
 * @description Per-row actions menu for a registered checkout: refresh, apply
 * editor config, and remove. Each item posts the same intent and hidden fields
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
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'refreshCheckout' &&
    navigation.formData.get('id') === checkout.id;

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

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={`${REPOSITORIES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${checkout.displayName}`}
      className={className}
      testId={`RepositoryRowActions-${checkout.id}`}
    />
  );
};
