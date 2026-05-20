import * as React from 'react';
import classnames from 'classnames';

export interface PopoverContentProps {
  readonly className?: string;
}

export const PopoverContent = (
  props: PopoverContentProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="PopoverContent">
      <h2>PopoverContent</h2>
    </div>
  );
};
