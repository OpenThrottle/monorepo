/** @description Outcome of parsing the raw body as JSON. */
export type WebhookJsonResult =
  { readonly ok: false } | { readonly ok: true; readonly payload: unknown };
