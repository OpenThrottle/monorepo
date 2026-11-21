import { createHash } from 'node:crypto';

import {
  WEBHOOK_ALLOWED_HEADERS,
  WEBHOOK_DEDUPE_KEY_MAX_LENGTH,
  WEBHOOK_HEADER_VALUE_MAX_LENGTH,
} from '../agent-job-webhooks.constants.ts';
import type { WebhookJsonResult } from './request.types.ts';

/** @description Lowercase hex sha256 of the raw body. */
export const sha256Hex = (body: Buffer): string => {
  return createHash('sha256').update(body).digest('hex');
};

/** @description Whether a Content-Type header names `application/json` (parameters such as charset are fine). */
export const isJsonContentType = (contentType: string | undefined): boolean => {
  if (contentType === undefined) {
    return false;
  }

  const mediaType = contentType.split(';')[0]?.trim().toLowerCase();

  return mediaType === 'application/json';
};

/**
 * @description Picks the allow-listed headers (plus the trigger's configured delivery-id and
 * timestamp headers) out of the request headers, lowercase-keyed and truncated. The signature
 * header is never in the allow-list, so it is never logged.
 */
export const pickAllowedHeaders = (
  headers: Readonly<Record<string, string | undefined>>,
  extraNames: readonly (string | null)[],
): Record<string, string> => {
  const allowed = new Set<string>(WEBHOOK_ALLOWED_HEADERS);

  for (const name of extraNames) {
    if (name !== null) {
      allowed.add(name.toLowerCase());
    }
  }

  const picked: Record<string, string> = {};

  for (const name of [...allowed].sort()) {
    const value = headers[name];

    if (value !== undefined) {
      picked[name] = value.slice(0, WEBHOOK_HEADER_VALUE_MAX_LENGTH);
    }
  }

  return picked;
};

/**
 * @description The dedupe key: the sender's delivery id when its header is configured and present,
 * else the sha256 of the raw body.
 */
export const resolveDedupeKey = (input: {
  readonly bodySha256: string;
  readonly deliveryIdHeader: string | null;
  readonly headers: Readonly<Record<string, string | undefined>>;
}): string => {
  if (input.deliveryIdHeader !== null) {
    const id = input.headers[input.deliveryIdHeader.toLowerCase()]?.trim();

    if (id !== undefined && id !== '') {
      return id.slice(0, WEBHOOK_DEDUPE_KEY_MAX_LENGTH);
    }
  }

  return input.bodySha256;
};

/** @description Parses the raw bytes as JSON. Never throws. */
export const parseWebhookJson = (rawBody: Buffer): WebhookJsonResult => {
  try {
    return { ok: true, payload: JSON.parse(rawBody.toString('utf8')) };
  } catch {
    return { ok: false };
  }
};
