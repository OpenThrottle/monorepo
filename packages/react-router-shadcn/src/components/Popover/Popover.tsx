import * as React from 'react';
import classnames from 'classnames';

export interface PopoverProps {
  readonly className?: string;
}

export const Popover = (props: PopoverProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="Popover">
      <h2>Popover</h2>
    </div>
  );
};
