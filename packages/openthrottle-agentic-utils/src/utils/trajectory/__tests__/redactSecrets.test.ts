import { describe, expect, it } from 'vitest';

import { redactSecrets } from '../redactSecrets.ts';

describe('redactSecrets', () => {
  it('redacts bearer tokens and sk- keys', () => {
    const out = redactSecrets('Bearer abc.def and sk-abcdefghijklmnop');

    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('abc.def');
    expect(out).not.toContain('sk-abcdefghijklmnop');
  });

  it('redacts password assignments', () => {
    const out = redactSecrets('password=hunter2');

    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('hunter2');
  });
});
