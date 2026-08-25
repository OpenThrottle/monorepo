import * as React from 'react';
import clsx from 'clsx';
import { GLOBAL_POPOVER_COPY } from '../data/data.copy';

/**
 * @public
 * Canonical right-aligned `Actions` column header for tables that use
 * {@link GlobalPopover} in the cell. Matches the queues table markup so every
 * migrated table shares one inset and weight.
 */
export interface GlobalPopoverActionsHeaderProps {
  readonly className?: string;
}

/**
 * @public
 */
export const GlobalPopoverActionsHeader = (
  props: GlobalPopoverActionsHeaderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('p-2 text-center', className)}
      data-testid="GlobalPopoverActionsHeader"
    >
      <span className="text-sm font-medium">
        {GLOBAL_POPOVER_COPY.actionsHeader}
      </span>
    </div>
  );
};
