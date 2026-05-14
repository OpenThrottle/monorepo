import * as React from 'react';
import classnames from 'classnames';

export interface CommandSeparatorProps {
  readonly className?: string;
}

export const CommandSeparator = (
  props: CommandSeparatorProps,
): React.ReactElement => {
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
      data-testid="CommandSeparator"
    >
      <h2>CommandSeparator</h2>
    </div>
  );
};
