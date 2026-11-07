import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';

import { createProxyServer } from 'http-proxy-3';

import { isGraphqlSocketPath, isProxiedPath } from './is-proxied-path.ts';

export interface OtProxy {
  /** Wires `/graphql` WebSocket upgrades onto the http server. */
  readonly attachUpgrade: (server: Server) => void;
  /** Handles an HTTP request; returns false when the path is not proxied. */
  readonly handleRequest: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => boolean;
}

/**
 * @description Same-origin reverse proxy from the child's own origin to the OT
 * server, for `/graphql` (HTTP and WebSocket) and `/health`. The browser only
 * ever talks to the loopback origin, so the OT server needs no CORS entry for
 * the desktop app.
 */
export const createOtProxy = (target: string): OtProxy => {
  const proxy = createProxyServer({ changeOrigin: true, target });

  const handleRequest = (
    request: IncomingMessage,
    response: ServerResponse,
  ): boolean => {
    if (!isProxiedPath(request.url)) {
      return false;
    }

    proxy.web(request, response, () => {
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'text/plain' });
      }

      response.end('OpenThrottle server unreachable');
    });

    return true;
  };

  const attachUpgrade = (server: Server): void => {
    server.on(
      'upgrade',
      (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        if (!isGraphqlSocketPath(request.url)) {
          socket.destroy();

          return;
        }

        proxy.ws(request, socket, head, () => {
          socket.destroy();
        });
      },
    );
  };

  return { attachUpgrade, handleRequest };
};
