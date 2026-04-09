import * as React from 'react';
import classnames from 'classnames';

export interface DialogContentProps {
  readonly className?: string;
}

export const DialogContent = (
  props: DialogContentProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="DialogContent">
      <h2>DialogContent</h2>
    </div>
  );
};
