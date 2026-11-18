import { describe, expect, it } from 'vitest';

import { hashPassword, validatePassword } from './password.utils.ts';

describe('hashPassword', () => {
  it('returns a bcrypt hash that is not the plain password', async () => {
    const hash = await hashPassword('secret', 4);

    expect(hash).not.toBe('secret');
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
  });

  it('salts every hash differently', async () => {
    const first = await hashPassword('secret', 4);
    const second = await hashPassword('secret', 4);

    expect(first).not.toBe(second);
  });
});

describe('validatePassword', () => {
  it('accepts the password a hash was made from', async () => {
    const hash = await hashPassword('secret', 4);

    await expect(validatePassword('secret', hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('secret', 4);

    await expect(validatePassword('wrong', hash)).resolves.toBe(false);
  });

  it.each([null, undefined, ''])('rejects the hash %j', async (hash) => {
    await expect(validatePassword('secret', hash)).resolves.toBe(false);
  });
});
