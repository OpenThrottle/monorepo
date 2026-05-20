import * as React from 'react';
import classnames from 'classnames';

export interface PopoverDescriptionProps {
  readonly className?: string;
}

export const PopoverDescription = (
  props: PopoverDescriptionProps,
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
      data-testid="PopoverDescription"
    >
      <h2>PopoverDescription</h2>
    </div>
  );
};
