import * as React from 'react';

export interface NotificationPermissionDeniedProps {
  readonly className?: string;
}

export const NotificationPermissionDenied = (
  _props: NotificationPermissionDeniedProps,
) => {
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
      data-testid="NotificationPermissionDenied"
    >
      Desktop notifications are blocked. You can re-enable them in your
      browser&apos;s site settings.
    </p>
  );
};
