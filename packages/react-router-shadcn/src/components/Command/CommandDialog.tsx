import * as React from 'react';
import classnames from 'classnames';

export interface CommandDialogProps {
  readonly className?: string;
}

export const CommandDialog = (
  props: CommandDialogProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="CommandDialog">
      <h2>CommandDialog</h2>
    </div>
  );
};
