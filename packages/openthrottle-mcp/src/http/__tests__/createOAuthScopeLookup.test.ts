import { describe, expect, it, vi } from 'vitest';

import { createOAuthScopeLookup } from '../createOAuthScopeLookup.ts';

describe('createOAuthScopeLookup', () => {
  it('caches per token until the TTL passes', async () => {
    let now = 0;
    const fetchScopes = vi.fn().mockResolvedValue(['mcp:read']);
    const lookup = createOAuthScopeLookup({
      fetchScopes,
      maxEntries: 10,
      now: () => now,
      ttlMs: 100,
    });

    expect(await lookup('t')).toEqual(['mcp:read']);
    expect(await lookup('t')).toEqual(['mcp:read']);
    expect(fetchScopes).toHaveBeenCalledTimes(1);

    now = 101;
    await lookup('t');
    expect(fetchScopes).toHaveBeenCalledTimes(2);
  });

  it('returns null on failure without caching it', async () => {
    const fetchScopes = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(['mcp:read']);
    const lookup = createOAuthScopeLookup({
      fetchScopes,
      maxEntries: 10,
      now: () => 0,
      ttlMs: 100,
    });

    expect(await lookup('t')).toBeNull();
    expect(await lookup('t')).toEqual(['mcp:read']);
  });
});
