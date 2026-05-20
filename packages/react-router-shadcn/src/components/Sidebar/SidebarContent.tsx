import * as React from 'react';
import classnames from 'classnames';

export interface SidebarContentProps {
  readonly className?: string;
}

export const SidebarContent = (
  props: SidebarContentProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarContent">
      <h2>SidebarContent</h2>
    </div>
  );
};
