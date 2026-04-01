import type { NotificationSeverity } from '@openthrottle/openthrottle-notifications';

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

export function severityToColor(severity: NotificationSeverity): string {
  switch (severity) {
    case 'error':
      return 'bg-destructive';
    case 'warning':
      return 'bg-amber-500';
    case 'success':
      return 'bg-green-500';

    default:
      return 'bg-muted-foreground';
  }
}
