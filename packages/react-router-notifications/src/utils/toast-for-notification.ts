import type { NotificationPayload } from '@openthrottle/openthrottle-notifications';
import { toast } from '@openthrottle/react-router-shadcn';

const buildViewAction = (
  link: NotificationPayload['link'],
  navigate: ((path: string) => void) | undefined,
): { label: string; onClick: () => void } | undefined => {
  if (!link || !navigate) {
    return undefined;
  }

  return { label: 'View', onClick: () => navigate(link) };
};

/**
 * Maps notification severity to sonner toast method; optional action to open payload.link.
 *
 * @public
 */
export function toastForNotification(
  payload: NotificationPayload,
  navigate?: (path: string) => void,
): void {
  let method: keyof typeof toast = 'info';

  switch (payload.severity) {
    case 'error':
      method = 'error';
      break;
    case 'success':
      method = 'success';
      break;
    case 'info':
      method = 'info';
      break;
    case 'warning':
      method = 'warning';
      break;
  }

  const action = buildViewAction(payload.link, navigate);

  toast[method](payload.message, action !== undefined ? { action } : undefined);
}
