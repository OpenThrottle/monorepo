import * as React from 'react';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { rolloutFlagEditPath } from '~/routing/settings/utils/rollout-flag-format';

export interface RolloutFlagsTableRowActionsProps {
  readonly flag: RolloutFlagFieldsFragment;
}

/**
 * @description Per-row GlobalPopover for rollout flags: edit (link) and delete
 * (submit + confirm). Posts the same `intent` / `id` fields the inline Form used.
 */
export const RolloutFlagsTableRowActions = (
  props: RolloutFlagsTableRowActionsProps,
): React.ReactElement => {
  const { flag } = props;

  // Hooks

  // Setup
  const actions: GlobalPopoverAction[] = [
    {
      id: 'edit',
      kind: 'link',
      label: ROLLOUT_COPY.editButton,
      to: rolloutFlagEditPath(flag.id),
    },
    {
      confirm: {
        cancelLabel: ROLLOUT_COPY.cancelButton,
        confirmLabel: ROLLOUT_COPY.deleteButton,
        description: (
          <>
            {ROLLOUT_COPY.deleteConfirmDescriptionPrefix}{' '}
            <span className="font-medium">{flag.key}</span>
            {ROLLOUT_COPY.deleteConfirmDescriptionSuffix}
          </>
        ),
        title: ROLLOUT_COPY.deleteConfirmTitle,
      },
      destructive: true,
      fields: { id: flag.id, intent: 'deleteRolloutFlag' },
      id: 'delete',
      kind: 'submit',
      label: ROLLOUT_COPY.deleteButton,
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
      ariaLabel={`${ROLLOUT_COPY.menuAriaLabelPrefix} ${flag.key}`}
      testId={`RolloutFlagsTableRowActions-${flag.id}`}
    />
  );
};
