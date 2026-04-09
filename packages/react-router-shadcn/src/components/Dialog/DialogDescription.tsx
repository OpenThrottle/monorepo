import * as React from 'react';
import classnames from 'classnames';

export interface DialogDescriptionProps {
  readonly className?: string;
}

export const DialogDescription = (
  props: DialogDescriptionProps,
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
      data-testid="DialogDescription"
    >
      <h2>DialogDescription</h2>
    </div>
  );
};
