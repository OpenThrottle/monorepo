import * as React from 'react';
import classnames from 'classnames';

export interface SidebarMenuSubItemProps {
  readonly className?: string;
}

export const SidebarMenuSubItem = (
  props: SidebarMenuSubItemProps,
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
      data-testid="SidebarMenuSubItem"
    >
      <h2>SidebarMenuSubItem</h2>
    </div>
  );
};
