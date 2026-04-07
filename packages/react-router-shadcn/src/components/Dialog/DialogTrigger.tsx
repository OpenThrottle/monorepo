import * as React from 'react';
import classnames from 'classnames';

export interface DialogTriggerProps {
  readonly className?: string;
}

export const DialogTrigger = (
  props: DialogTriggerProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="DialogTrigger">
      <h2>DialogTrigger</h2>
    </div>
  );
};
