import { createServer } from 'node:http';

import { STUB_SERVER_HEALTH } from '../data/data.smoke.ts';

export interface StubOtServer {
  readonly close: () => Promise<void>;
  /** How many `POST /graphql` requests it has answered. */
  readonly graphqlRequests: () => number;
  readonly origin: string;
}

/**
 * @description Starts a loopback HTTP server that answers `POST /graphql`
 * with a healthy `serverHealth` payload and 404s everything else. It stands in
 * for the OT server in a smoke run: main probes it before starting the
 * embedded child, and the child's `/graphql` proxy forwards to it, so counting
 * its requests proves the proxy works.
 */
export const createStubOtServer = async (): Promise<StubOtServer> => {
  let graphqlRequests = 0;

  const server = createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      if (request.method === 'POST' && request.url === '/graphql') {
        graphqlRequests += 1;
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({ data: { serverHealth: STUB_SERVER_HEALTH } }),
        );

        return;
      }

      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('stub OT server could not read its bound port');
  }

  return {
    close: () => {
      return new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => {
          resolve();
        });
      });
    },
    graphqlRequests: () => {
      return graphqlRequests;
    },
    origin: `http://127.0.0.1:${address.port}`,
  };
};
