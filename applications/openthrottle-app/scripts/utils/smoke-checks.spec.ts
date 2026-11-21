import type { SmokeFetch } from './smoke-checks.ts';
import { runSmokeChecks, waitForShellHealth } from './smoke-checks.ts';

const ORIGIN = 'http://127.0.0.1:5000';

const HTML = new Response('<!DOCTYPE html><html><body>sign in</body></html>', {
  headers: { 'content-type': 'text/html; charset=utf-8' },
});

const healthJson = (api: string): Response => {
  return new Response(JSON.stringify({ data: { serverHealth: { api } } }), {
    headers: { 'content-type': 'application/json' },
  });
};

const routes = (
  table: Readonly<Record<string, () => Response>>,
): SmokeFetch => {
  return (url) => {
    const answer = table[new URL(url).pathname];

    return answer === undefined
      ? Promise.reject(new TypeError('fetch failed'))
      : Promise.resolve(answer());
  };
};

describe('waitForShellHealth', () => {
  it('polls through 503 until the health answer is ok', async () => {
    const answers = [
      new Response('starting', { status: 503 }),
      new Response('ok', { status: 200 }),
    ];
    const sleep = vi.fn(() => Promise.resolve());
    const result = await waitForShellHealth({
      fetch: () => Promise.resolve(answers.shift() ?? new Response('x')),
      intervalMs: 10,
      now: () => 0,
      origin: ORIGIN,
      sleep,
      timeoutMs: 1000,
    });

    expect(result).toEqual({
      detail: '200 ok',
      name: '/__shell/health',
      ok: true,
    });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('fails with the last answer once the budget runs out', async () => {
    const clock = [0, 2000];
    const result = await waitForShellHealth({
      fetch: () => Promise.reject(new TypeError('fetch failed')),
      intervalMs: 10,
      now: () => clock.shift() ?? 2000,
      origin: ORIGIN,
      sleep: () => Promise.resolve(),
      timeoutMs: 1000,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('fetch failed');
  });
});

describe('runSmokeChecks', () => {
  it('passes when /auth renders HTML and /graphql reaches the OT server', async () => {
    const results = await runSmokeChecks({
      fetch: routes({
        '/auth': () => HTML.clone(),
        '/graphql': () => healthJson('ok'),
      }),
      origin: ORIGIN,
      timeoutMs: 1000,
    });

    expect(results.map((result) => result.ok)).toEqual([true, true]);
  });

  it('fails /graphql when the proxy answers with something else', async () => {
    const results = await runSmokeChecks({
      fetch: routes({
        '/auth': () => HTML.clone(),
        '/graphql': () => new Response('bad gateway', { status: 502 }),
      }),
      origin: ORIGIN,
      timeoutMs: 1000,
    });

    expect(results[1]).toMatchObject({
      detail: 'expected 200, got 502',
      ok: false,
    });
  });

  it('fails /auth when it is not an HTML page', async () => {
    const results = await runSmokeChecks({
      fetch: routes({
        '/auth': () => healthJson('ok'),
        '/graphql': () => healthJson('ok'),
      }),
      origin: ORIGIN,
      timeoutMs: 1000,
    });

    expect(results[0]?.ok).toBe(false);
  });

  it('reports every check when the server is unreachable', async () => {
    const results = await runSmokeChecks({
      fetch: routes({}),
      origin: ORIGIN,
      timeoutMs: 1000,
    });

    expect(results).toHaveLength(2);
    expect(results.every((result) => !result.ok)).toBe(true);
  });
});
