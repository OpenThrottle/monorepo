import { describe, expect, it } from 'vitest';

import type { McpHttpAuthResponse } from '../mcp-http-auth.middleware.ts';
import type { McpPublicAuthMode } from '../protected-resource.ts';
import { protectedResourceMetadataMiddleware } from '../protected-resource-metadata.middleware.ts';

const mode: McpPublicAuthMode = {
  allowStaticToken: false,
  issuer: 'https://api.example.com',
  kind: 'public',
  resource: 'https://mcp.example.com/mcp',
};

interface Served {
  readonly body: string | undefined;
  readonly headers: Map<string, string>;
  readonly nextCalled: boolean;
  readonly status: number;
}

function serve(method: string, url: string): Served {
  const headers = new Map<string, string>();
  let body: string | undefined;
  let nextCalled = false;
  const res: McpHttpAuthResponse = {
    end: (value?: string) => {
      body = value;
    },
    setHeader: (name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    },
    statusCode: 200,
  };
  protectedResourceMetadataMiddleware(mode, 'openthrottle')(
    { headers: {}, method, url },
    res,
    () => {
      nextCalled = true;
    },
  );
  return { body, headers, nextCalled, status: res.statusCode };
}

describe('protectedResourceMetadataMiddleware', () => {
  it('serves the document on the path-suffixed well-known path', () => {
    const served = serve('GET', '/.well-known/oauth-protected-resource/mcp');

    expect(served.status).toBe(200);
    expect(served.headers.get('access-control-allow-origin')).toBe('*');
    expect(JSON.parse(served.body ?? '{}')).toMatchObject({
      authorization_servers: ['https://api.example.com'],
      resource: 'https://mcp.example.com/mcp',
    });
  });

  it('passes other paths through', () => {
    expect(serve('POST', '/mcp').nextCalled).toBe(true);
  });

  it('answers a CORS preflight', () => {
    expect(
      serve('OPTIONS', '/.well-known/oauth-protected-resource').status,
    ).toBe(204);
  });

  it('refuses a write method', () => {
    expect(serve('POST', '/.well-known/oauth-protected-resource').status).toBe(
      405,
    );
  });
});
