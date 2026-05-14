import * as React from 'react';
import classnames from 'classnames';

export interface CommandEmptyProps {
  readonly className?: string;
}

export const CommandEmpty = (props: CommandEmptyProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="CommandEmpty">
      <h2>CommandEmpty</h2>
    </div>
  );
};
