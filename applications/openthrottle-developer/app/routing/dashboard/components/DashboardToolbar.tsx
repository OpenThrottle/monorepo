import * as React from 'react';
import classnames from 'classnames';

export interface DashboardToolbarProps {
  readonly className?: string;
}

export const DashboardToolbar = (props: DashboardToolbarProps) => {
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
      data-testid="DashboardToolbar"
    >
      <h2>DashboardToolbar</h2>
    </div>
  );
};
