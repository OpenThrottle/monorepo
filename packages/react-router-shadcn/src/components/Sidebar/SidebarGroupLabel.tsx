import * as React from 'react';
import classnames from 'classnames';

export interface SidebarGroupLabelProps {
  readonly className?: string;
}

export const SidebarGroupLabel = (
  props: SidebarGroupLabelProps,
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
      data-testid="SidebarGroupLabel"
    >
      <h2>SidebarGroupLabel</h2>
    </div>
  );
};
