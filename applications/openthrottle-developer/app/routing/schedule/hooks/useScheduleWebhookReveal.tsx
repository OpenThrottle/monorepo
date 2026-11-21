import * as React from 'react';

import type { WebhookCredentials } from '~/routing/schedule/utils/getWebhookCredentials';
import { getWebhookCredentials } from '~/routing/schedule/utils/getWebhookCredentials';

export interface UseScheduleWebhookRevealOptions {
  /** The detail route's action result; carries credentials only right after a create or rotate. */
  readonly actionData: unknown;
}

export interface UseScheduleWebhookRevealResult {
  /** The URL path and secret to show once, or `undefined` when there is nothing to reveal. */
  readonly credentials: WebhookCredentials | undefined;
  readonly dismiss: () => void;
}

/**
 * @description Holds the webhook URL path and secret in memory for the one-time reveal. The server
 * returns them once, on create or rotate, in the action result; the route's `actionData` is cleared
 * by the next navigation (switching tabs, say), so they are copied into component state, which lives
 * until the person dismisses them or leaves the page. They are never written to storage, a cookie,
 * the URL or the loader data.
 */
export const useScheduleWebhookReveal = (
  options: UseScheduleWebhookRevealOptions,
): UseScheduleWebhookRevealResult => {
  const { actionData } = options;

  // Hooks
  const [credentials, setCredentials] = React.useState<
    WebhookCredentials | undefined
  >(undefined);

  // Setup

  // Handlers
  const dismiss = (): void => {
    setCredentials(undefined);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const revealed = getWebhookCredentials(actionData);

    if (revealed !== undefined) {
      setCredentials(revealed);
    }
  }, [actionData]);

  // 🔌 Short Circuit

  return { credentials, dismiss };
};
