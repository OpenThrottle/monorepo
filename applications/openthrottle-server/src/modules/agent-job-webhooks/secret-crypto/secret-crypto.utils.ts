import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import {
  WEBHOOK_RANDOM_BYTES,
  WEBHOOK_SECRET_ENCRYPTION_KEY_ENV,
} from '../agent-job-webhooks.constants.ts';
import type {
  WebhookEncryptionKeyResult,
  WebhookSecretDecryptResult,
} from './secret-crypto.types.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/**
 * @description Reads `WEBHOOK_SECRET_ENCRYPTION_KEY` (32 bytes, base64). A missing, malformed or
 * wrong-length key is a failed result, never a fallback: ingress answers 503 and trigger creation
 * refuses, so a secret is never stored in plaintext.
 */
export const resolveWebhookEncryptionKey = (
  env: Readonly<Record<string, string | undefined>>,
): WebhookEncryptionKeyResult => {
  const raw = env[WEBHOOK_SECRET_ENCRYPTION_KEY_ENV]?.trim() ?? '';

  if (raw === '') {
    return {
      message: `${WEBHOOK_SECRET_ENCRYPTION_KEY_ENV} is not set. Generate one with: openssl rand -base64 32`,
      ok: false,
    };
  }

  const key = Buffer.from(raw, 'base64');

  if (key.length !== KEY_BYTES) {
    return {
      message: `${WEBHOOK_SECRET_ENCRYPTION_KEY_ENV} must be ${KEY_BYTES} bytes, base64 encoded (got ${key.length}). Generate one with: openssl rand -base64 32`,
      ok: false,
    };
  }

  return { key, ok: true };
};

/** @description A fresh HMAC secret: 32 random bytes, base64url. The string itself is the HMAC key. */
export const generateWebhookSecret = (): string => {
  return randomBytes(WEBHOOK_RANDOM_BYTES).toString('base64url');
};

/** @description AES-256-GCM encrypt. Layout: 12-byte IV, 16-byte auth tag, then the ciphertext. */
export const encryptWebhookSecret = (secret: string, key: Buffer): Buffer => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
};

/**
 * @description AES-256-GCM decrypt. A tampered blob, a truncated blob or the wrong key all fail the
 * auth tag check and come back as a failed result.
 */
export const decryptWebhookSecret = (
  blob: Buffer,
  key: Buffer,
): WebhookSecretDecryptResult => {
  if (blob.length < IV_BYTES + TAG_BYTES) {
    return { message: `Stored webhook secret is truncated`, ok: false };
  }

  try {
    const iv = blob.subarray(0, IV_BYTES);
    const tag = blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = blob.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const secret = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');

    return { ok: true, secret };
  } catch {
    return {
      message: `Stored webhook secret failed authentication (tampered, or encrypted under a different key)`,
      ok: false,
    };
  }
};
