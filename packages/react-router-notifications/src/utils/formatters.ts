import type { NotificationSeverity } from '@openthrottle/openthrottle-notifications';
import { NotificationSocketStatus } from '../types';

/**
 * @description Formats an ISO timestamp as a short relative label for notification UI.
 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();

  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString();
}

/**
 * @description Small UI indicator for the notifications WebSocket connection status.
 * Renders a colored dot for use in layout (e.g. footer).
 */
export function formatStatusToColor(status: NotificationSocketStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500';

    case 'connecting':
    case 'reconnecting':
      return 'bg-amber-500';

    case 'disconnected':
    case 'error':
      return 'bg-red-500';

    default:
      return 'bg-amber-500';
  }
}

/**
 * @description Maps notification severity to a Tailwind background class for the item dot.
 */
export function formatSeverityToColor(severity: NotificationSeverity): string {
  switch (severity) {
    case 'error':
      return 'bg-destructive';
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-amber-500';

    default:
      return 'bg-muted-foreground';
  }
}
