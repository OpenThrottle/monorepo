import * as React from 'react';
import classnames from 'classnames';

export interface TooltipContentProps {
  readonly className?: string;
}

export const TooltipContent = (
  props: TooltipContentProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="TooltipContent">
      <h2>TooltipContent</h2>
    </div>
  );
};
