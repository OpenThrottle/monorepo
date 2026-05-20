import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuBadgeProps {
  readonly className?: string;
}

export const SidebarMenuBadge = (
  props: SidebarMenuBadgeProps,
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
      data-testid="SidebarMenuBadge"
    >
      <h2>SidebarMenuBadge</h2>
    </div>
  );
};
