import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  decryptWebhookSecret,
  encryptWebhookSecret,
  generateWebhookSecret,
  resolveWebhookEncryptionKey,
} from './secret-crypto.utils.ts';

const key = randomBytes(32);

describe('resolveWebhookEncryptionKey', () => {
  it('accepts 32 bytes of base64', () => {
    const result = resolveWebhookEncryptionKey({
      WEBHOOK_SECRET_ENCRYPTION_KEY: key.toString('base64'),
    });

    expect(result).toStrictEqual({ key, ok: true });
  });

  it('fails when the variable is missing', () => {
    const result = resolveWebhookEncryptionKey({});

    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain(
      'WEBHOOK_SECRET_ENCRYPTION_KEY is not set',
    );
  });

  it('fails when the variable is blank', () => {
    expect(
      resolveWebhookEncryptionKey({ WEBHOOK_SECRET_ENCRYPTION_KEY: '  ' }).ok,
    ).toBe(false);
  });

  it('fails when the key is not 32 bytes', () => {
    const result = resolveWebhookEncryptionKey({
      WEBHOOK_SECRET_ENCRYPTION_KEY: randomBytes(16).toString('base64'),
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('32 bytes');
  });
});

describe('encryptWebhookSecret / decryptWebhookSecret', () => {
  it('round-trips a secret', () => {
    const secret = generateWebhookSecret();

    const decrypted = decryptWebhookSecret(
      encryptWebhookSecret(secret, key),
      key,
    );

    expect(decrypted).toStrictEqual({ ok: true, secret });
  });

  it('never stores the plaintext', () => {
    const secret = generateWebhookSecret();

    expect(encryptWebhookSecret(secret, key).includes(secret)).toBe(false);
  });

  it('uses a fresh IV, so equal secrets encrypt differently', () => {
    expect(encryptWebhookSecret('same', key)).not.toStrictEqual(
      encryptWebhookSecret('same', key),
    );
  });

  it('detects a tampered ciphertext', () => {
    const blob = encryptWebhookSecret('hunter2', key);
    blob[blob.length - 1] = (blob[blob.length - 1] ?? 0) ^ 1;

    expect(decryptWebhookSecret(blob, key).ok).toBe(false);
  });

  it('detects a tampered auth tag', () => {
    const blob = encryptWebhookSecret('hunter2', key);
    blob[14] = (blob[14] ?? 0) ^ 1;

    expect(decryptWebhookSecret(blob, key).ok).toBe(false);
  });

  it('fails under a different key', () => {
    const blob = encryptWebhookSecret('hunter2', key);

    expect(decryptWebhookSecret(blob, randomBytes(32)).ok).toBe(false);
  });

  it('fails on a truncated blob', () => {
    expect(decryptWebhookSecret(Buffer.alloc(10), key).ok).toBe(false);
  });
});

describe('generateWebhookSecret', () => {
  it('is 32 random bytes as base64url', () => {
    expect(Buffer.from(generateWebhookSecret(), 'base64url')).toHaveLength(32);
  });
});
