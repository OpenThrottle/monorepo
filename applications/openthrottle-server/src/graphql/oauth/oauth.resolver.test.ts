import { ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import type { OAuthService } from '@openthrottle/nestjs-repositories-server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthResolver } from './oauth.resolver.ts';

const human: AuthPrincipal = { kind: 'user', sub: 'user-1' };
const machine: AuthPrincipal = { kind: 'service_account', sub: 'sa-1' };

const pendingRequest = {
  client: {
    clientId: 'ot_client_x',
    clientName: 'Test client',
    clientUri: null,
    redirectUris: ['http://127.0.0.1/callback'],
    registrationKind: 'dcr',
  },
  expiresAt: new Date('2026-11-16T00:10:00Z'),
  id: 'req-1',
  redirectUri: 'http://127.0.0.1:5000/callback',
  requestedScopes: ['mcp:read', 'mcp:write'],
  resource: 'https://mcp.example.com/mcp',
  state: 'st',
};

const buildResolver = (
  overrides: Partial<Record<keyof OAuthService, unknown>>,
): OAuthResolver => {
  const service: Partial<Record<keyof OAuthService, unknown>> = {
    decideAuthorizationRequest: vi.fn(),
    findPendingAuthorizationRequest: vi.fn(),
    listActiveGrantsForUser: vi.fn().mockResolvedValue([]),
    revokeGrant: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return Reflect.construct(OAuthResolver, [service]);
};

describe('OAuthResolver', () => {
  beforeEach(() => {
    vi.stubEnv('APP_URL_DEVELOPER', 'https://app.example.com');
    vi.stubEnv('OT_MCP_PUBLIC_URL', 'https://mcp.example.com/mcp');
    vi.stubEnv('OT_OAUTH_ISSUER', 'https://api.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when the caller is a service account', () => {
    it('refuses every operation', async () => {
      const resolver = buildResolver({});

      await expect(
        resolver.oauthAuthorizationRequest(machine, 'req-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(resolver.myOAuthGrants(machine)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        resolver.revokeOAuthGrant(machine, 'g-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('when the caller authenticated with an OAuth token', () => {
    it('refuses to let it consent', async () => {
      const resolver = buildResolver({});
      const viaToken: AuthPrincipal = {
        kind: 'user',
        oauth: {
          clientId: 'c',
          grantId: 'g',
          scopes: ['mcp:read', 'mcp:write'],
        },
        sub: 'user-1',
      };

      await expect(
        resolver.decideOAuthAuthorization(viaToken, {
          approve: true,
          id: 'req-1',
          scopes: ['mcp:read'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(resolver.myOAuthGrants(viaToken)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('decideOAuthAuthorization', () => {
    it('returns the client redirect with code, state and iss on approve', async () => {
      const decide = vi.fn().mockResolvedValue({
        code: 'the-code',
        kind: 'approved',
        ok: true,
        request: pendingRequest,
      });
      const resolver = buildResolver({ decideAuthorizationRequest: decide });

      const result = await resolver.decideOAuthAuthorization(human, {
        approve: true,
        id: 'req-1',
        scopes: ['mcp:read', 'bogus'],
      });
      const url = new URL(result.redirectUrl);

      expect(decide).toHaveBeenCalledWith(
        expect.objectContaining({ scopes: ['mcp:read'], userId: 'user-1' }),
      );
      expect(url.origin + url.pathname).toBe('http://127.0.0.1:5000/callback');
      expect(url.searchParams.get('code')).toBe('the-code');
      expect(url.searchParams.get('state')).toBe('st');
      expect(url.searchParams.get('iss')).toBe('https://api.example.com');
    });

    it('returns access_denied on deny', async () => {
      const resolver = buildResolver({
        decideAuthorizationRequest: vi.fn().mockResolvedValue({
          kind: 'denied',
          ok: true,
          request: pendingRequest,
        }),
      });

      const result = await resolver.decideOAuthAuthorization(human, {
        approve: false,
        id: 'req-1',
        scopes: [],
      });

      expect(new URL(result.redirectUrl).searchParams.get('error')).toBe(
        'access_denied',
      );
    });

    it('surfaces a failed decision as a GraphQL error without a redirect', async () => {
      const resolver = buildResolver({
        decideAuthorizationRequest: vi.fn().mockResolvedValue({
          description: 'expired',
          error: 'invalid_request',
          ok: false,
        }),
      });

      await expect(
        resolver.decideOAuthAuthorization(human, {
          approve: true,
          id: 'req-1',
          scopes: ['mcp:read'],
        }),
      ).rejects.toThrow('expired');
    });
  });

  describe('oauthAuthorizationRequest', () => {
    it('maps a pending request for the consent screen', async () => {
      const resolver = buildResolver({
        findPendingAuthorizationRequest: vi
          .fn()
          .mockResolvedValue(pendingRequest),
      });

      const result = await resolver.oauthAuthorizationRequest(human, 'req-1');

      expect(result).toMatchObject({
        clientHost: '127.0.0.1',
        clientName: 'Test client',
        redirectHost: '127.0.0.1:5000',
        requestedScopes: ['mcp:read', 'mcp:write'],
      });
    });

    it('is null for an unknown request', async () => {
      const resolver = buildResolver({
        findPendingAuthorizationRequest: vi.fn().mockResolvedValue(null),
      });

      expect(
        await resolver.oauthAuthorizationRequest(human, 'nope'),
      ).toBeNull();
    });
  });

  describe('viewerOAuthScopes', () => {
    it('returns the token scopes for an OAuth principal and null otherwise', () => {
      const resolver = buildResolver({});

      expect(
        resolver.viewerOAuthScopes({
          kind: 'user',
          oauth: { clientId: 'c', grantId: 'g', scopes: ['mcp:read'] },
          sub: 'u',
        }),
      ).toEqual(['mcp:read']);
      expect(resolver.viewerOAuthScopes(human)).toBeNull();
      expect(resolver.viewerOAuthScopes(machine)).toBeNull();
    });
  });

  describe('revokeOAuthGrant', () => {
    it('scopes the revocation to the caller', async () => {
      const revokeGrant = vi.fn().mockResolvedValue(true);
      const resolver = buildResolver({ revokeGrant });

      await resolver.revokeOAuthGrant(human, 'g-1');

      expect(revokeGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          grantId: 'g-1',
          reason: 'user',
          userId: 'user-1',
        }),
      );
    });
  });
});
