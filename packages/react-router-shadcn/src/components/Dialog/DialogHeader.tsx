import * as React from 'react';
import classnames from 'classnames';

export interface DialogHeaderProps {
  readonly className?: string;
}

export const DialogHeader = (props: DialogHeaderProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="DialogHeader">
      <h2>DialogHeader</h2>
    </div>
  );
};
