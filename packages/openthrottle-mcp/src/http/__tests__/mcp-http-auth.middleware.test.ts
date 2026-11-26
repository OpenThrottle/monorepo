import { describe, expect, it } from 'vitest';

import { requestAuthTokenStorage } from '../../utils/getAuthToken.ts';
import type { McpHttpAuthResponse } from '../mcp-http-auth.middleware.ts';
import {
  extractBearerToken,
  mcpHttpAuthMiddleware,
} from '../mcp-http-auth.middleware.ts';
import type { McpPublicAuthMode } from '../protected-resource.ts';

describe('extractBearerToken', () => {
  it('returns the token for a Bearer header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('trims surrounding whitespace', () => {
    expect(extractBearerToken('Bearer   tok  ')).toBe('tok');
  });

  it('returns empty for a missing, non-Bearer, or malformed header', () => {
    expect(extractBearerToken(undefined)).toBe('');
    expect(extractBearerToken('Basic abc')).toBe('');
    expect(extractBearerToken('token-without-scheme')).toBe('');
  });
});

describe('mcpHttpAuthMiddleware', () => {
  const run = (authorization: string | undefined): string | undefined => {
    const middleware = mcpHttpAuthMiddleware();
    let seen: string | undefined;
    middleware(
      { headers: { authorization }, url: '/mcp' },
      createResponse(),
      () => {
        seen = requestAuthTokenStorage.getStore();
      },
    );
    return seen;
  };

  it('exposes the bearer token to the request-scoped store', () => {
    expect(run('Bearer human.jwt.here')).toBe('human.jwt.here');
  });

  it('leaves the store empty when no bearer header is present (env fallback)', () => {
    expect(run(undefined)).toBeUndefined();
    expect(run('Basic nope')).toBeUndefined();
  });

  it('isolates tokens across sequential requests (no leakage)', () => {
    expect(run('Bearer first')).toBe('first');
    // Outside any run(), the store is empty again.
    expect(requestAuthTokenStorage.getStore()).toBeUndefined();
    expect(run('Bearer second')).toBe('second');
  });
});

interface RecordedResponse extends McpHttpAuthResponse {
  readonly body: () => string | undefined;
  readonly headers: Map<string, string>;
}

function createResponse(): RecordedResponse {
  const headers = new Map<string, string>();
  let body: string | undefined;
  return {
    body: () => body,
    end: (value?: string) => {
      body = value;
    },
    headers,
    setHeader: (name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    },
    statusCode: 200,
  };
}

const PUBLIC_MODE: McpPublicAuthMode = {
  allowStaticToken: false,
  issuer: 'https://api.example.com',
  kind: 'public',
  resource: 'https://mcp.example.com/mcp',
};

describe('mcpHttpAuthMiddleware in public mode', () => {
  const runPublic = (
    request: {
      readonly authorization: string | undefined;
      readonly url: string;
    },
    mode: McpPublicAuthMode = PUBLIC_MODE,
    warn: (message: string) => void = () => undefined,
  ): {
    readonly nextCalled: boolean;
    readonly res: RecordedResponse;
    readonly store: string | undefined;
  } => {
    const res = createResponse();
    let nextCalled = false;
    let store: string | undefined;
    mcpHttpAuthMiddleware({ mode, now: () => 0, warn })(
      { headers: { authorization: request.authorization }, url: request.url },
      res,
      () => {
        nextCalled = true;
        store = requestAuthTokenStorage.getStore();
      },
    );
    return { nextCalled, res, store };
  };

  it('refuses a request with no bearer with a 401 OAuth challenge', () => {
    const result = runPublic({ authorization: undefined, url: '/mcp' });

    expect(result.nextCalled).toBe(false);
    expect(result.res.statusCode).toBe(401);
    expect(result.res.headers.get('www-authenticate')).toBe(
      'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp", scope="mcp:read mcp:write"',
    );
  });

  it('forwards an explicit bearer to the request-scoped store', () => {
    const result = runPublic({
      authorization: 'Bearer ot_oat_x_y',
      url: '/mcp',
    });

    expect(result.nextCalled).toBe(true);
    expect(result.store).toBe('ot_oat_x_y');
  });

  it('lets anonymous discovery requests through', () => {
    const result = runPublic({
      authorization: undefined,
      url: '/.well-known/oauth-protected-resource/mcp',
    });

    expect(result.nextCalled).toBe(true);
  });

  describe('with the deprecated OT_MCP_ALLOW_STATIC_TOKEN flag', () => {
    it('falls back to the env token and warns at most once a minute', () => {
      const warnings: string[] = [];
      const mode: McpPublicAuthMode = {
        ...PUBLIC_MODE,
        allowStaticToken: true,
      };
      const middleware = mcpHttpAuthMiddleware({
        mode,
        now: () => 1_000,
        warn: (message) => warnings.push(message),
      });
      let calls = 0;
      const request = { headers: { authorization: undefined }, url: '/mcp' };

      middleware(request, createResponse(), () => {
        calls += 1;
      });
      middleware(request, createResponse(), () => {
        calls += 1;
      });

      expect(calls).toBe(2);
      expect(warnings).toHaveLength(1);
    });
  });
});
