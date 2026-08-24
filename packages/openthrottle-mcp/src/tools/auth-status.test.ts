/**
 * @description Tests for the auth_status tool: it must ALWAYS return a structured
 * verdict (never throw), redact the token, and distinguish authenticated / stale /
 * inconclusive from the GraphQL probe outcome.
 */

import {
  executeGraphqlWithAuth,
  getGraphQLUrl,
} from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStatusToolHandler } from './auth-status.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
  getGraphQLUrl: vi.fn(() => 'http://localhost:6021/graphql'),
}));

describe('authStatusToolHandler', () => {
  const originalToken = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;

  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    vi.mocked(getGraphQLUrl).mockReturnValue('http://localhost:6021/graphql');
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    delete process.env.OT_MCP_AUTH_TOKEN_ENV_FILE;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    } else {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = originalToken;
    }
  });

  it('reports UNAUTHENTICATED with reconnect steps when no token is set', async () => {
    const result = await authStatusToolHandler({});

    expect(result).toMatchObject({
      structuredContent: {
        authStatus: {
          authenticated: false,
          tokenIdentity: null,
          tokenPresent: false,
        },
      },
    });
    expect(result.content[0].text).toMatch(
      /reconnect|\.env|bootstrap-service-accounts/i,
    );
    expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
  });

  it('reports AUTHENTICATED and redacts a service-account token when the probe succeeds', async () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_abc123_supersecretvalue';
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      listSources: { plans: [], sources: [] },
    });

    const result = await authStatusToolHandler({});

    expect(result).toMatchObject({
      structuredContent: {
        authStatus: {
          authenticated: true,
          tokenIdentity: 'ot_sa_abc123',
          tokenPresent: true,
        },
      },
    });
    // The secret must never appear anywhere in the output.
    expect(result.content[0].text).not.toContain('supersecretvalue');
  });

  it('reports STALE / UNAUTHENTICATED when the server rejects the token', async () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_abc123_secret';
    vi.mocked(executeGraphqlWithAuth).mockRejectedValue(
      new Error('GraphQL errors: Unauthorized'),
    );

    const result = await authStatusToolHandler({});

    expect(result).toMatchObject({
      structuredContent: {
        authStatus: {
          authenticated: false,
          tokenPresent: true,
        },
      },
    });
    expect(result.content[0].text).toMatch(/STALE|silent-401/i);
  });

  it('reports INCONCLUSIVE (not stale) on a transient server/network error', async () => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'ot_sa_abc123_secret';
    vi.mocked(executeGraphqlWithAuth).mockRejectedValue(
      new Error('openthrottle-server GraphQL error 503: Service Unavailable'),
    );

    const result = await authStatusToolHandler({});

    expect(result).toMatchObject({
      structuredContent: {
        authStatus: {
          authenticated: false,
          tokenPresent: true,
        },
      },
    });
    expect(result.content[0].text).toMatch(/INCONCLUSIVE/);
  });
});
