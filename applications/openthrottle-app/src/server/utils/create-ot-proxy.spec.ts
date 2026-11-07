import type { Server } from 'node:http';
import { createServer } from 'node:http';

import { createOtProxy } from './create-ot-proxy.ts';

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  return typeof address === 'object' && address !== null ? address.port : 0;
};

describe('createOtProxy', () => {
  const servers: Server[] = [];

  afterEach(() => {
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      server.close();
    }
  });

  it('forwards /graphql POSTs to the OT server and leaves other paths alone', async () => {
    const upstream = createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({ method: request.method, url: request.url }),
      );
    });
    const upstreamPort = await listen(upstream);
    const proxy = createOtProxy(`http://127.0.0.1:${upstreamPort}`);
    const front = createServer((request, response) => {
      if (!proxy.handleRequest(request, response)) {
        response.statusCode = 404;
        response.end('app');
      }
    });
    servers.push(upstream, front);
    const frontPort = await listen(front);

    const proxied = await fetch(`http://127.0.0.1:${frontPort}/graphql`, {
      body: '{}',
      method: 'POST',
    });
    const app = await fetch(`http://127.0.0.1:${frontPort}/plans`);

    expect(await proxied.json()).toEqual({ method: 'POST', url: '/graphql' });
    expect(app.status).toBe(404);
  });

  it('answers 502 when the OT server is unreachable', async () => {
    const proxy = createOtProxy('http://127.0.0.1:1');
    const front = createServer((request, response) => {
      proxy.handleRequest(request, response);
    });
    servers.push(front);
    const frontPort = await listen(front);

    const response = await fetch(`http://127.0.0.1:${frontPort}/health`);

    expect(response.status).toBe(502);
  });
});
