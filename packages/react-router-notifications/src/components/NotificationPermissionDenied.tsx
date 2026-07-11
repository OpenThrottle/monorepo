import * as React from 'react';

export interface NotificationPermissionDeniedProps {
  readonly className?: string;
}

/** @public */
export const NotificationPermissionDenied = (
  _props: NotificationPermissionDeniedProps,
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
      data-testid="NotificationPermissionDenied"
    >
      Desktop notifications are blocked. You can re-enable them in your
      browser&apos;s site settings.
    </p>
  );
};
