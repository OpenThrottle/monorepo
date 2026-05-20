import * as React from 'react';
import classnames from 'classnames';

export interface SidebarHeaderProps {
  readonly className?: string;
}

export const SidebarHeader = (
  props: SidebarHeaderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarHeader">
      <h2>SidebarHeader</h2>
    </div>
  );
};
