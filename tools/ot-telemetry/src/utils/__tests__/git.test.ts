import { describe, expect, it } from 'vitest';

import { hashActorEmail } from '../git.ts';

describe('hashActorEmail', () => {
  it('is deterministic for the same email', () => {
    expect(hashActorEmail('dev@example.com')).toBe(
      hashActorEmail('dev@example.com'),
    );
  });

  it('normalizes case and surrounding whitespace before hashing', () => {
    expect(hashActorEmail('  Dev@Example.com ')).toBe(
      hashActorEmail('dev@example.com'),
    );
  });

  it('produces different keys for different emails', () => {
    expect(hashActorEmail('dev-a@example.com')).not.toBe(
      hashActorEmail('dev-b@example.com'),
    );
  });

  it('never contains the source email as a substring (one-way)', () => {
    const email = 'someone-recognizable@example.com';
    expect(hashActorEmail(email)).not.toContain(email);
  });

  it('is a 32-character lowercase hex digest', () => {
    expect(hashActorEmail('dev@example.com')).toMatch(/^[0-9a-f]{32}$/);
  });
});
