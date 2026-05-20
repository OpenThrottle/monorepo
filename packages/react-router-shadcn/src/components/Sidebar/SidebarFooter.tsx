import * as React from 'react';
import classnames from 'classnames';

export interface SidebarFooterProps {
  readonly className?: string;
}

export const SidebarFooter = (
  props: SidebarFooterProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarFooter">
      <h2>SidebarFooter</h2>
    </div>
  );
};
