import * as React from 'react';
import classnames from 'classnames';

export interface PopoverHeaderProps {
  readonly className?: string;
}

export const PopoverHeader = (
  props: PopoverHeaderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="PopoverHeader">
      <h2>PopoverHeader</h2>
    </div>
  );
};
