import * as React from 'react';
import classnames from 'classnames';

export interface SidebarGroupContentProps {
  readonly className?: string;
}

export const SidebarGroupContent = (
  props: SidebarGroupContentProps,
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
      data-testid="SidebarGroupContent"
    >
      <h2>SidebarGroupContent</h2>
    </div>
  );
};
