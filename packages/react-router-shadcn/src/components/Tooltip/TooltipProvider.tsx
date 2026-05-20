import * as React from 'react';
import classnames from 'classnames';

export interface TooltipProviderProps {
  readonly className?: string;
}

export const TooltipProvider = (
  props: TooltipProviderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="TooltipProvider">
      <h2>TooltipProvider</h2>
    </div>
  );
};
