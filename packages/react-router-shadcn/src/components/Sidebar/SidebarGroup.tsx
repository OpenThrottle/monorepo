import * as React from 'react';
import classnames from 'classnames';

export interface SidebarGroupProps {
  readonly className?: string;
}

export const SidebarGroup = (props: SidebarGroupProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarGroup">
      <h2>SidebarGroup</h2>
    </div>
  );
};
