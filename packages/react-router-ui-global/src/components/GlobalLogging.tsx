import * as React from 'react';
import classnames from 'classnames';

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
    <div className={classnames('p-4', className)} data-testid="GlobalLogging">
      <h2>GlobalLogging</h2>
    </div>
  );
};
