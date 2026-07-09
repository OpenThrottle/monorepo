import * as React from 'react';
import clsx from 'clsx';

export interface GlobalLoggingProps {
  readonly className?: string;
}

export const GlobalLogging = (
  props: GlobalLoggingProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('p-4', className)} data-testid="GlobalLogging">
      <h2>GlobalLogging</h2>
    </div>
  );
};
