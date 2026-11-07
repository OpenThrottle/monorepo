import { describe, expect, it, vi } from 'vitest';

import { probeOtServer } from './probe-ot-server.ts';

const HEALTH = {
  api: 'ok',
  database: 'ok',
  redis: 'unreachable',
  websocket: 'ok',
};

const json = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), { status });
};

describe('probeOtServer', () => {
  it('POSTs the serverHealth query to <server>/graphql and returns the health', async () => {
    const fetch = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(json({ data: { serverHealth: HEALTH } })),
    );
    const result = await probeOtServer('http://a.test:6021', {
      fetch,
      timeoutMs: 1000,
    });

    expect(result).toEqual({ health: HEALTH, ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'http://a.test:6021/graphql',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetch.mock.calls[0]?.[1]?.body).toContain('serverHealth');
  });

  it('fails on a non-2xx answer', async () => {
    const result = await probeOtServer('http://a.test', {
      fetch: () => Promise.resolve(json({}, 404)),
      timeoutMs: 1000,
    });

    expect(result).toMatchObject({ ok: false });
  });

  it('fails when the answer is not an OT health payload', async () => {
    const result = await probeOtServer('http://a.test', {
      fetch: () => Promise.resolve(json({ data: { other: 1 } })),
      timeoutMs: 1000,
    });

    expect(result).toMatchObject({ ok: false });
  });

  it('fails when the body is not JSON', async () => {
    const result = await probeOtServer('http://a.test', {
      fetch: () => Promise.resolve(new Response('<html>')),
      timeoutMs: 1000,
    });

    expect(result).toMatchObject({ ok: false });
  });

  it('fails when the API is not ok', async () => {
    const result = await probeOtServer('http://a.test', {
      fetch: () =>
        Promise.resolve(
          json({ data: { serverHealth: { ...HEALTH, api: 'down' } } }),
        ),
      timeoutMs: 1000,
    });

    expect(result).toMatchObject({ ok: false });
  });

  it('reports a network failure with its cause', async () => {
    const result = await probeOtServer('http://a.test', {
      fetch: () =>
        Promise.reject(
          new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') }),
        ),
      timeoutMs: 1000,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'Could not reach the server (ECONNREFUSED).',
    });
  });

  it('times out when the server never answers', async () => {
    const result = await probeOtServer('http://a.test', {
      fetch: (_url, init) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        });
      },
      timeoutMs: 20,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'The server did not answer in time.',
    });
  });
});
