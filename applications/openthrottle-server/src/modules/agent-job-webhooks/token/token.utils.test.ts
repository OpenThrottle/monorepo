import { describe, expect, it } from 'vitest';

import {
  generateWebhookToken,
  hashWebhookToken,
  tokenHashesEqual,
} from './token.utils.ts';

describe('generateWebhookToken', () => {
  it('mints 32 random bytes as 43 base64url characters', () => {
    const { token } = generateWebhookToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('returns the sha256 of the token and its first 6 characters', () => {
    const minted = generateWebhookToken();

    expect(minted.tokenHash).toStrictEqual(hashWebhookToken(minted.token));
    expect(minted.tokenHash).toHaveLength(32);
    expect(minted.tokenPrefix).toBe(minted.token.slice(0, 6));
  });

  it('never repeats', () => {
    expect(generateWebhookToken().token).not.toBe(generateWebhookToken().token);
  });
});

describe('tokenHashesEqual', () => {
  it('is true for equal hashes', () => {
    expect(tokenHashesEqual(hashWebhookToken('a'), hashWebhookToken('a'))).toBe(
      true,
    );
  });

  it('is false for different hashes', () => {
    expect(tokenHashesEqual(hashWebhookToken('a'), hashWebhookToken('b'))).toBe(
      false,
    );
  });

  it('is false, without throwing, for different lengths', () => {
    expect(tokenHashesEqual(Buffer.alloc(31), Buffer.alloc(32))).toBe(false);
  });
});
