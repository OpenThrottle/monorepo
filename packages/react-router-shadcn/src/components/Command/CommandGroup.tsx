import * as React from 'react';
import classnames from 'classnames';

export interface CommandGroupProps {
  readonly className?: string;
}

export const CommandGroup = (props: CommandGroupProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="CommandGroup">
      <h2>CommandGroup</h2>
    </div>
  );
};
