import * as React from 'react';
import classnames from 'classnames';

export interface useSidebarProps {
  readonly className?: string;
}

export const useSidebar = (props: useSidebarProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="useSidebar">
      <h2>useSidebar</h2>
    </div>
  );
};
