import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuItemProps {
  readonly className?: string;
}

export const SidebarMenuItem = (
  props: SidebarMenuItemProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarMenuItem">
      <h2>SidebarMenuItem</h2>
    </div>
  );
};
