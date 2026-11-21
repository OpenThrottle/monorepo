export interface WebhookCredentials {
  readonly secret: string;
  readonly webhookPath: string;
}

/**
 * @description Picks the one-time credentials out of a route action result, or `undefined` when the
 * action did not create or rotate a webhook. A runtime check rather than a cast: the action result is
 * a union the component cannot narrow by shape alone.
 */
export const getWebhookCredentials = (
  actionData: unknown,
): WebhookCredentials | undefined => {
  if (typeof actionData !== 'object' || actionData === null) {
    return undefined;
  }

  const hasCredentials = 'webhookCredentials' in actionData;
  const credentials: unknown = hasCredentials
    ? actionData.webhookCredentials
    : undefined;

  if (
    typeof credentials === 'object' &&
    credentials !== null &&
    'secret' in credentials &&
    typeof credentials.secret === 'string' &&
    'webhookPath' in credentials &&
    typeof credentials.webhookPath === 'string'
  ) {
    return {
      secret: credentials.secret,
      webhookPath: credentials.webhookPath,
    };
  }

  return undefined;
};
