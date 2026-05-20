import * as React from 'react';
import classnames from 'classnames';

export interface SidebarInsetProps {
  readonly className?: string;
}

export const SidebarInset = (props: SidebarInsetProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarInset">
      <h2>SidebarInset</h2>
    </div>
  );
};
