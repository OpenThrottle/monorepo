/**
 * @description The full webhook URL a sender POSTs to: the API's public origin plus the ingress path
 * the server returned once on create or rotate. The origin is `API_URL_EXTERNAL` from `window.env`
 * (the same public origin the browser's GraphQL socket uses); the server only knows its path.
 */
export const buildWebhookUrl = (
  origin: string | undefined,
  webhookPath: string,
): string => {
  const path = webhookPath.startsWith('/') ? webhookPath : `/${webhookPath}`;

  return `${(origin ?? '').replace(/\/+$/, '')}${path}`;
};
