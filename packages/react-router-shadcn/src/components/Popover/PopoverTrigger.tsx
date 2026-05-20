import * as React from 'react';
import classnames from 'classnames';

export interface PopoverTriggerProps {
  readonly className?: string;
}

export const PopoverTrigger = (
  props: PopoverTriggerProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="PopoverTrigger">
      <h2>PopoverTrigger</h2>
    </div>
  );
};
