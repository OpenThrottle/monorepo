import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { completeXAuthorization } from '../completeXAuthorization.ts';
import type { FetchLike } from '../x-oauth.ts';

describe('completeXAuthorization', () => {
  let dir: string;
  let envPath: string;
  const fetch = vi.fn<FetchLike>(async () => {
    return new Response(
      JSON.stringify({
        access_token: 'access-1',
        expires_in: 7200,
        refresh_token: 'refresh-first-1',
        scope: 'tweet.read tweet.write users.read offline.access',
      }),
    );
  });
  const params = (
    callback: string,
  ): Parameters<typeof completeXAuthorization>[0] => {
    return {
      callback: new URLSearchParams(callback),
      client: { clientId: 'client-abc', clientSecret: undefined },
      envPath,
      expectedState: 'state-1',
      fetch,
      now: () => 0,
      redirectUri: 'http://127.0.0.1:8765/callback',
      verifier: 'verifier-1',
    };
  };

  beforeEach(async () => {
    fetch.mockClear();
    dir = await mkdtemp(join(tmpdir(), 'x-auth-'));
    envPath = join(dir, 'nested', '.env');
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('exchanges the code with the PKCE verifier and stores the refresh token', async () => {
    const result = await completeXAuthorization(
      params('code=code-1&state=state-1'),
    );

    expect(result).toEqual({
      ok: true,
      value: { scope: 'tweet.read tweet.write users.read offline.access' },
    });
    const body = new URLSearchParams(String(fetch.mock.calls[0]?.[1].body));
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code_verifier')).toBe('verifier-1');
    expect(body.get('redirect_uri')).toBe('http://127.0.0.1:8765/callback');
    const written = await readFile(envPath, 'utf8');
    expect(written).toContain('X_CLIENT_ID=client-abc');
    expect(written).toContain('X_REFRESH_TOKEN=refresh-first-1');
    expect(written).not.toContain('X_CLIENT_SECRET');
  });

  it('refuses a redirect whose state does not match', async () => {
    const result = await completeXAuthorization(
      params('code=code-1&state=other'),
    );

    expect(!result.ok && result.error.kind).toBe('state-mismatch');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports a denied approval', async () => {
    const result = await completeXAuthorization(
      params('error=access_denied&state=state-1'),
    );

    expect(!result.ok && result.error.kind).toBe('denied');
  });
});
