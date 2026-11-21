import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  WEBHOOK_RANDOM_BYTES,
  WEBHOOK_TOKEN_PREFIX_LENGTH,
} from '../agent-job-webhooks.constants.ts';
import type { GeneratedWebhookToken } from './token.types.ts';

/** @description `sha256(token)`, the only form of the URL token that is stored. */
export const hashWebhookToken = (token: string): Buffer => {
  return createHash('sha256').update(token, 'utf8').digest();
};

/** @description 32 random bytes, base64url (43 characters), with its stored hash and display prefix. */
export const generateWebhookToken = (): GeneratedWebhookToken => {
  const token = randomBytes(WEBHOOK_RANDOM_BYTES).toString('base64url');

  return {
    token,
    tokenHash: hashWebhookToken(token),
    tokenPrefix: token.slice(0, WEBHOOK_TOKEN_PREFIX_LENGTH),
  };
};

/**
 * @description Constant-time comparison of two token hashes. A length mismatch is a plain false
 * (`timingSafeEqual` throws on unequal lengths).
 */
export const tokenHashesEqual = (left: Buffer, right: Buffer): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
};
