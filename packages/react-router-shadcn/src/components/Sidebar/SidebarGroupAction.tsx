import * as React from 'react';
import classnames from 'classnames';

export interface SidebarGroupActionProps {
  readonly className?: string;
}

export const SidebarGroupAction = (
  props: SidebarGroupActionProps,
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
      data-testid="SidebarGroupAction"
    >
      <h2>SidebarGroupAction</h2>
    </div>
  );
};
