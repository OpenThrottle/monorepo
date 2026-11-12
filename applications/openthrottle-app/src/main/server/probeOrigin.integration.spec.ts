import type { Server } from 'node:http';
import { createServer } from 'node:http';

import type { ProbeOptions } from './probeOrigin.ts';
import { probeOrigin } from './probeOrigin.ts';

const realOptions: ProbeOptions = {
  fetch: (url, init) => fetch(url, init),
  intervalMs: 20,
  now: () => Date.now(),
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
  timeoutMs: 300,
};

const listen = async (server: Server): Promise<string> => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port =
    typeof address === 'object' && address !== null ? address.port : 0;

  return `http://127.0.0.1:${port}`;
};

describe('probeOrigin', () => {
  const servers: Server[] = [];

  afterEach(() => {
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      server.close();
    }
  });

  it('succeeds once the health route answers 200 after a 503', async () => {
    let calls = 0;
    const server = createServer((_request, response) => {
      calls += 1;
      response.statusCode = calls < 3 ? 503 : 200;
      response.end();
    });
    servers.push(server);

    const result = await probeOrigin(await listen(server), realOptions);

    expect(result).toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it('fails with a reason when nothing is listening', async () => {
    const result = await probeOrigin('http://127.0.0.1:1', realOptions);

    expect(result.ok).toBe(false);
  });

  it('fails on timeout when the server never answers', async () => {
    const server = createServer(() => {
      // Never respond.
    });
    servers.push(server);

    const result = await probeOrigin(await listen(server), realOptions);

    expect(result).toMatchObject({ ok: false });
  });

  it('fails when the status never becomes 200', async () => {
    const result = await probeOrigin('http://x', {
      ...realOptions,
      fetch: () => Promise.resolve({ status: 503 }),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining('503'),
    });
  });
});
