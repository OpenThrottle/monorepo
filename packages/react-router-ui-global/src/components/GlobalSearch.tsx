import * as React from 'react';
import clsx from 'clsx';

export interface GlobalSearchProps {
  readonly className?: string;
}

export const GlobalSearch = (props: GlobalSearchProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('p-4', className)} data-testid="GlobalSearch">
      <h2>GlobalSearch</h2>
    </div>
  );
};
