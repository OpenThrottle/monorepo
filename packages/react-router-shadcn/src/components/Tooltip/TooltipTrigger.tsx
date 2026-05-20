import * as React from 'react';
import classnames from 'classnames';

export interface TooltipTriggerProps {
  readonly className?: string;
}

export const TooltipTrigger = (
  props: TooltipTriggerProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="TooltipTrigger">
      <h2>TooltipTrigger</h2>
    </div>
  );
};
