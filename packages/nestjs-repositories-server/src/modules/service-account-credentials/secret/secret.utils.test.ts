import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';

import {
  hashSecret,
  isLegacySecretHash,
  validateSecret,
} from './secret.utils.ts';

describe('hashSecret', () => {
  it('returns the hex SHA-256 of the secret', () => {
    expect(hashSecret('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('isLegacySecretHash', () => {
  it('recognises a bcrypt hash', async () => {
    const hash = await bcrypt.hash('test-secret', 4);

    expect(isLegacySecretHash(hash)).toBe(true);
  });

  it('does not treat a SHA-256 hash as legacy', () => {
    expect(isLegacySecretHash(hashSecret('test-secret'))).toBe(false);
  });
});

describe('validateSecret', () => {
  describe('when the hash is SHA-256', () => {
    it('matches the secret it was made from', async () => {
      const hash = hashSecret('test-secret');

      await expect(validateSecret('test-secret', hash)).resolves.toBe(true);
      await expect(validateSecret('wrong', hash)).resolves.toBe(false);
    });

    it('rejects a hash of the wrong length', async () => {
      await expect(validateSecret('test-secret', 'abc123')).resolves.toBe(
        false,
      );
    });
  });

  describe('when the hash is a legacy bcrypt hash', () => {
    it('matches through bcrypt', async () => {
      const hash = await bcrypt.hash('test-secret', 4);

      await expect(validateSecret('test-secret', hash)).resolves.toBe(true);
      await expect(validateSecret('wrong', hash)).resolves.toBe(false);
    });
  });

  it.each([null, undefined, ''])('rejects the hash %j', async (hash) => {
    await expect(validateSecret('test-secret', hash)).resolves.toBe(false);
  });
});
