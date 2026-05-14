import * as React from 'react';
import classnames from 'classnames';

export interface CommandListProps {
  readonly className?: string;
}

export const CommandList = (props: CommandListProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="CommandList">
      <h2>CommandList</h2>
    </div>
  );
};
