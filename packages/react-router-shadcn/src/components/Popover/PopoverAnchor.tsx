import * as React from 'react';
import classnames from 'classnames';

export interface PopoverAnchorProps {
  readonly className?: string;
}

export const PopoverAnchor = (
  props: PopoverAnchorProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="PopoverAnchor">
      <h2>PopoverAnchor</h2>
    </div>
  );
};
