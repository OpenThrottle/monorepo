import * as React from 'react';

export interface NotificationPermissionUnsupportedProps {
  readonly className?: string;
}

/** @public */
export const NotificationPermissionUnsupported = (
  _props: NotificationPermissionUnsupportedProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      className="text-muted-foreground text-xs"
      data-testid="NotificationPermissionUnsupported"
    >
      Desktop notifications require HTTPS or a supported browser.
    </p>
  );
};
