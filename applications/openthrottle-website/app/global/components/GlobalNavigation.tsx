import * as React from 'react';
import classnames from 'classnames';

export interface GlobalNavigationProps {
  readonly className?: string;
}

export const GlobalNavigation = (props: GlobalNavigationProps) => {
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
      data-testid="GlobalNavigation"
    >
      <h2>GlobalNavigation</h2>
    </div>
  );
};
