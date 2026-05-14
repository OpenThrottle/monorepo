import * as React from 'react';
import classnames from 'classnames';

export interface CommandItemProps {
  readonly className?: string;
}

export const CommandItem = (props: CommandItemProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="CommandItem">
      <h2>CommandItem</h2>
    </div>
  );
};
