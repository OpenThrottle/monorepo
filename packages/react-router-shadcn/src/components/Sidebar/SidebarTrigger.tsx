import * as React from 'react';
import classnames from 'classnames';

export interface SidebarTriggerProps {
  readonly className?: string;
}

export const SidebarTrigger = (
  props: SidebarTriggerProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SidebarTrigger">
      <h2>SidebarTrigger</h2>
    </div>
  );
};
