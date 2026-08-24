import * as React from 'react';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';

export interface RulesTableRowActionsProps {
  readonly onToggleEnabled: (rule: TagActionRuleRowData) => void;
  readonly pending: boolean;
  readonly rule: TagActionRuleRowData;
}

/**
 * @description Per-row GlobalPopover for enable/disable, edit, and delete.
 */
export const RulesTableRowActions = (
  props: RulesTableRowActionsProps,
): React.ReactElement => {
  const { onToggleEnabled, pending, rule } = props;

  // Hooks

  // Setup
  const toggleLabel = rule.enabled
    ? RULES_COPY.disableAction
    : RULES_COPY.enableAction;
  const actions: GlobalPopoverAction[] = [
    {
      disabled: pending,
      id: 'toggle',
      kind: 'select',
      label: toggleLabel,
      onSelect: () => {
        onToggleEnabled(rule);
      },
    },
    {
      id: 'edit',
      kind: 'link',
      label: RULES_COPY.editAction,
      to: `/rules/${rule.id}/edit`,
    },
    {
      confirm: {
        cancelLabel: RULES_COPY.deleteConfirmCancel,
        confirmLabel: RULES_COPY.deleteConfirmLabel,
        description: (
          <>
            {RULES_COPY.deleteConfirmDescriptionPrefix}{' '}
            <span className="font-medium">{rule.title}</span>
            {RULES_COPY.deleteConfirmDescriptionSuffix}
          </>
        ),
        title: RULES_COPY.deleteConfirmTitle,
      },
      destructive: true,
      disabled: pending,
      fields: { id: rule.id, intent: 'deleteRule' },
      id: 'delete',
      kind: 'submit',
      label: RULES_COPY.deleteAction,
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
      ariaLabel={`${RULES_COPY.menuAriaLabelPrefix} ${rule.title}`}
    />
  );
};
