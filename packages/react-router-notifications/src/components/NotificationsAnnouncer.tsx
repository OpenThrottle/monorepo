import * as React from 'react';
import type { NotificationSeverity } from '@openthrottle/openthrottle-notifications';

export interface NotificationsAnnouncerProps {
  /** Message of the most recently added notification, or null when none yet. */
  readonly message: string | null;
  /** Severity of the most recently added notification; `error` announces assertively. */
  readonly severity: NotificationSeverity | null;
}

/**
 * @description Visually-hidden ARIA live region that announces the most recent
 * notification message to assistive technology. New notifications arrive via toast +
 * bell badge, neither of which the store reliably announces, so this region gives
 * screen-reader users a spoken notice. Polite by default; `error` severity escalates
 * to `assertive` so failures interrupt. Rendered once by
 * {@link NotificationsStoreProvider}; updates whenever a notification is added.
 *
 * @publicApi
 */
export function NotificationsAnnouncer(
  props: NotificationsAnnouncerProps,
): React.ReactElement {
  const { message, severity } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-atomic="true"
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
      className="sr-only"
      data-testid="notifications-announcer"
      role={severity === 'error' ? 'alert' : 'status'}
    >
      {message ?? ''}
    </div>
  );
}
