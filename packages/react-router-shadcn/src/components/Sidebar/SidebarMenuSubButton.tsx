import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuSubButtonProps {
  readonly className?: string;
}

export const SidebarMenuSubButton = (
  props: SidebarMenuSubButtonProps,
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
      data-testid="SidebarMenuSubButton"
    >
      <h2>SidebarMenuSubButton</h2>
    </div>
  );
};
