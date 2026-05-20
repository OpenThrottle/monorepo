import * as React from 'react';
import classnames from 'classnames';

export interface ToggleGroupItemProps {
  readonly className?: string;
}

export const ToggleGroupItem = (
  props: ToggleGroupItemProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="ToggleGroupItem">
      <h2>ToggleGroupItem</h2>
    </div>
  );
};
