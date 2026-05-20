import * as React from 'react';
import classnames from 'classnames';

export interface SidebarProviderProps {
  readonly className?: string;
}

export const SidebarProvider = (
  props: SidebarProviderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarProvider">
      <h2>SidebarProvider</h2>
    </div>
  );
};
