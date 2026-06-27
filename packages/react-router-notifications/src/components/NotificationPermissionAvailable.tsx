import * as React from 'react';
import classnames from 'classnames';

export interface NotificationPermissionAvailableProps {
  readonly className?: string;
}

/** @publicApi */
export const NotificationPermissionAvailable = (
  props: NotificationPermissionAvailableProps,
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
      data-testid="NotificationPermissionAvailable"
    >
      <h2>NotificationPermissionAvailable</h2>
    </div>
  );
};
