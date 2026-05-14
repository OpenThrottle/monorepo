import * as React from 'react';
import classnames from 'classnames';

export interface CommandProps {
  readonly className?: string;
}

export const Command = (props: CommandProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="Command">
      <h2>Command</h2>
    </div>
  );
};
