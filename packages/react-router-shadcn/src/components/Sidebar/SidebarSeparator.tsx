import * as React from 'react';
import classnames from 'classnames';

export interface SidebarSeparatorProps {
  readonly className?: string;
}

export const SidebarSeparator = (
  props: SidebarSeparatorProps,
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
      data-testid="SidebarSeparator"
    >
      <h2>SidebarSeparator</h2>
    </div>
  );
};
