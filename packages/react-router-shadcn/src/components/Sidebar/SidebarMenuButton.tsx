import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuButtonProps {
  readonly className?: string;
}

export const SidebarMenuButton = (
  props: SidebarMenuButtonProps,
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
      data-testid="SidebarMenuButton"
    >
      <h2>SidebarMenuButton</h2>
    </div>
  );
};
