import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuActionProps {
  readonly className?: string;
}

export const SidebarMenuAction = (
  props: SidebarMenuActionProps,
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
      className={classnames('p-4', className)}
      data-testid="SidebarMenuAction"
    >
      <h2>SidebarMenuAction</h2>
    </div>
  );
};
