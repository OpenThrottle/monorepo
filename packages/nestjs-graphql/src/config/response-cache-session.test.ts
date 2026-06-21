import type { BaseContext } from '@apollo/server';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  defaultResponseCacheSessionId,
  type ResponseCacheSessionRequestContext,
} from './response-cache-session';

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

/**
 * Build the minimal request-context surface the helper reads: the resolved
 * context value plus the optional Authorization header. Uses the exported
 * structural type so no cast is needed.
 */
function makeRequestContext<TContext extends BaseContext>(args: {
  authorization?: string;
  contextValue: TContext;
}): ResponseCacheSessionRequestContext<TContext> {
  const headers = new Map<string, string>();
  if (args.authorization !== undefined) {
    headers.set('authorization', args.authorization);
  }

  return {
    contextValue: args.contextValue,
    request: {
      http: {
        headers: {
          get: (name: string): string | undefined =>
            headers.get(name.toLowerCase()),
        },
      },
    },
  };
}

describe('defaultResponseCacheSessionId', () => {
  it('derives a hashed key from the verified userId on context', async () => {
    const key = await defaultResponseCacheSessionId(
      makeRequestContext({
        authorization: 'Bearer should-be-ignored',
        contextValue: { userId: 'user-123' },
      }),
    );

    expect(key).toBe(`u:${sha256('user-123')}`);
    // Never embeds the raw user id or token.
    expect(key).not.toContain('user-123');
    expect(key).not.toContain('should-be-ignored');
  });

  it('is stable across token rotation when the userId is unchanged', async () => {
    const first = await defaultResponseCacheSessionId(
      makeRequestContext({
        authorization: 'Bearer token-A',
        contextValue: { userId: 'user-123' },
      }),
    );
    const second = await defaultResponseCacheSessionId(
      makeRequestContext({
        authorization: 'Bearer token-B',
        contextValue: { userId: 'user-123' },
      }),
    );

    expect(first).toBe(second);
  });

  it('falls back to a hashed Authorization header when no userId is present', async () => {
    const header = 'Bearer abc.def.ghi';
    const key = await defaultResponseCacheSessionId(
      makeRequestContext({ authorization: header, contextValue: {} }),
    );

    expect(key).toBe(`h:${sha256(header)}`);
    // The raw token is never embedded in the cache key.
    expect(key).not.toContain(header);
  });

  it('returns null for anonymous requests (no userId, no header)', async () => {
    const key = await defaultResponseCacheSessionId(
      makeRequestContext({ contextValue: {} }),
    );

    expect(key).toBeNull();
  });

  it('ignores a non-string userId and falls back to the header', async () => {
    const header = 'Bearer xyz';
    const key = await defaultResponseCacheSessionId(
      makeRequestContext({
        authorization: header,
        contextValue: { userId: 42 },
      }),
    );

    expect(key).toBe(`h:${sha256(header)}`);
  });
});
