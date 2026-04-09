import * as React from 'react';
import classnames from 'classnames';

export interface DialogTitleProps {
  readonly className?: string;
}

export const DialogTitle = (props: DialogTitleProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="DialogTitle">
      <h2>DialogTitle</h2>
    </div>
  );
};
