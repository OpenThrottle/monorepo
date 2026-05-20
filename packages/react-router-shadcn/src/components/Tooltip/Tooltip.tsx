import * as React from 'react';
import classnames from 'classnames';

export interface TooltipProps {
  readonly className?: string;
}

export const Tooltip = (props: TooltipProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="Tooltip">
      <h2>Tooltip</h2>
    </div>
  );
};
