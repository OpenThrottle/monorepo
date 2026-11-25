import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createXTokenClient } from '../createXTokenClient.ts';
import type { FetchLike } from '../x-oauth.ts';

const tokenResponse = (refreshToken: string, accessToken: string): Response => {
  return new Response(
    JSON.stringify({
      access_token: accessToken,
      expires_in: 7200,
      refresh_token: refreshToken,
      scope: 'tweet.read tweet.write users.read offline.access',
      token_type: 'bearer',
    }),
    { status: 200 },
  );
};

describe('createXTokenClient', () => {
  let dir: string;
  let envPath: string;
  let now: number;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'x-token-'));
    envPath = join(dir, '.env');
    now = Date.UTC(2026, 11, 1, 15);
    await writeFile(
      envPath,
      [
        'OPENTHROTTLE_GRAPHQL_URL=http://localhost:6021/graphql',
        'X_CLIENT_ID=client-abc',
        'X_REFRESH_TOKEN=refresh-original-1',
        '',
      ].join('\n'),
    );
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('refreshes, persists the rotated refresh token, and returns the access token', async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      return tokenResponse('refresh-rotated-2', 'access-token-2');
    });
    const client = createXTokenClient({ envPath, fetch, now: () => now });

    const result = await client.getAccessToken();

    expect(result).toEqual({ ok: true, value: 'access-token-2' });
    const body = new URLSearchParams(String(fetch.mock.calls[0]?.[1].body));
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('refresh-original-1');
    expect(body.get('client_id')).toBe('client-abc');
    expect(await readFile(envPath, 'utf8')).toBe(
      [
        'OPENTHROTTLE_GRAPHQL_URL=http://localhost:6021/graphql',
        'X_CLIENT_ID=client-abc',
        'X_REFRESH_TOKEN=refresh-rotated-2',
        '',
      ].join('\n'),
    );
    expect((await stat(envPath)).mode & 0o777).toBe(0o600);
  });

  it('reuses the access token until it nears expiry, then rotates again', async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(tokenResponse('refresh-2', 'access-2'))
      .mockResolvedValueOnce(tokenResponse('refresh-3', 'access-3'));
    const client = createXTokenClient({ envPath, fetch, now: () => now });

    await client.getAccessToken();
    now += 60 * 60 * 1000;
    expect(await client.getAccessToken()).toEqual({
      ok: true,
      value: 'access-2',
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 60 * 60 * 1000;
    expect(await client.getAccessToken()).toEqual({
      ok: true,
      value: 'access-3',
    });
    const second = new URLSearchParams(String(fetch.mock.calls[1]?.[1].body));
    expect(second.get('refresh_token')).toBe('refresh-2');
    expect(await readFile(envPath, 'utf8')).toContain(
      'X_REFRESH_TOKEN=refresh-3',
    );
  });

  it('authenticates a confidential client with HTTP Basic', async () => {
    await writeFile(
      envPath,
      'X_CLIENT_ID=client-abc\nX_CLIENT_SECRET=secret-xyz-123\nX_REFRESH_TOKEN=refresh-1\n',
    );
    const fetch = vi.fn<FetchLike>(async () => {
      return tokenResponse('refresh-2', 'access-2');
    });
    const client = createXTokenClient({ envPath, fetch, now: () => now });

    await client.getAccessToken();

    const headers = new Headers(fetch.mock.calls[0]?.[1].headers);
    expect(headers.get('Authorization')).toBe(
      `Basic ${Buffer.from('client-abc:secret-xyz-123').toString('base64')}`,
    );
  });

  it('reports auth when X refuses the refresh token, and redacts it from the message', async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      return new Response(
        '{"error":"invalid_request","error_description":"Value passed for the token was invalid: refresh-original-1"}',
        { status: 400 },
      );
    });
    const client = createXTokenClient({ envPath, fetch, now: () => now });

    const result = await client.getAccessToken();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe('auth');
    expect(JSON.stringify(result)).not.toContain('refresh-original-1');
    expect(await readFile(envPath, 'utf8')).toContain(
      'X_REFRESH_TOKEN=refresh-original-1',
    );
  });

  it('fails loudly when the rotated token cannot be written', async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      return tokenResponse('refresh-2', 'access-2');
    });
    const client = createXTokenClient({
      envPath: join(envPath, 'not-a-dir', '.env'),
      fetch,
      now: () => now,
    });

    const result = await client.getAccessToken();

    expect(!result.ok && result.error.kind).toBe('missing-config');
  });

  it('reports missing config without calling X', async () => {
    await writeFile(envPath, 'X_CLIENT_ID=client-abc\n');
    const fetch = vi.fn<FetchLike>();
    const client = createXTokenClient({ envPath, fetch, now: () => now });

    const result = await client.getAccessToken();

    expect(!result.ok && result.error.kind).toBe('missing-config');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('collects every token it saw for redaction', async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      return tokenResponse('refresh-rotated-2', 'access-token-2');
    });
    const client = createXTokenClient({ envPath, fetch, now: () => now });

    await client.getAccessToken();

    expect(client.secrets()).toEqual(
      expect.arrayContaining([
        'refresh-original-1',
        'refresh-rotated-2',
        'access-token-2',
      ]),
    );
  });
});
