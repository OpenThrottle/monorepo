import * as React from 'react';
import classnames from 'classnames';

export interface SidebarProps {
  readonly className?: string;
}

export const Sidebar = (props: SidebarProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="Sidebar">
      <h2>Sidebar</h2>
    </div>
  );
};
