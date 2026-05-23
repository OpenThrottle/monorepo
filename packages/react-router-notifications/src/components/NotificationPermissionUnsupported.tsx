import * as React from 'react';

export interface NotificationPermissionUnsupportedProps {
  readonly className?: string;
}

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
      className="text-xs text-muted-foreground"
      data-testid="NotificationPermissionUnsupported"
    >
      Desktop notifications require HTTPS or a supported browser.
    </p>
  );
};
