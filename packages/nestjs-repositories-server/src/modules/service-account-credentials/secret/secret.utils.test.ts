import { describe, expect, it } from 'vitest';

import { hashSecret, validateSecret } from './secret.utils.ts';

describe('hashSecret and validateSecret', () => {
  it('validates a hash produced by hashSecret', async () => {
    const hash = await hashSecret('test-secret', 4);

    await expect(validateSecret('test-secret', hash)).resolves.toBe(true);
    await expect(validateSecret('wrong', hash)).resolves.toBe(false);
  });

  it.each([null, undefined, ''])('rejects the hash %j', async (hash) => {
    await expect(validateSecret('test-secret', hash)).resolves.toBe(false);
  });
});
