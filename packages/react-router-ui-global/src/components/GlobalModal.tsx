import * as React from 'react';
import classnames from 'classnames';

export interface GlobalModalProps {
  readonly className?: string;
}

export const GlobalModal = (props: GlobalModalProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="GlobalModal">
      <h2>GlobalModal</h2>
    </div>
  );
};
