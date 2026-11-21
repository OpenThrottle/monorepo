import type {
  OAuthService,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthAccessAuthService } from './oauth-access-auth.service.ts';

const verified = {
  clientId: 'ot_client_x',
  grantId: 'g-1',
  resource: 'https://mcp.example.com/mcp',
  scopes: ['mcp:read'],
  tokenId: 't-1',
  userId: 'u-1',
};

const build = (options: {
  readonly user: { readonly disabledAt: Date | null } | null;
  readonly verified: typeof verified | null;
}): OAuthAccessAuthService => {
  const oauthService: Partial<Record<keyof OAuthService, unknown>> = {
    verifyAccessToken: vi.fn().mockResolvedValue(options.verified),
  };
  const usersRepository: Partial<Record<keyof UsersRepository, unknown>> = {
    findOne: vi.fn().mockResolvedValue(options.user),
  };
  return Reflect.construct(OAuthAccessAuthService, [
    oauthService,
    usersRepository,
  ]);
};

describe('OAuthAccessAuthService', () => {
  beforeEach(() => {
    vi.stubEnv('APP_URL_DEVELOPER', 'https://app.example.com');
    vi.stubEnv('OT_MCP_PUBLIC_URL', 'https://mcp.example.com/mcp');
    vi.stubEnv('OT_OAUTH_ISSUER', 'https://api.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('recognizes only access tokens', () => {
    const service = build({ user: null, verified: null });

    expect(service.isOAuthAuthorization('Bearer ot_oat_a_b')).toBe(true);
    expect(service.isOAuthAuthorization('Bearer ot_ort_a_b')).toBe(false);
    expect(service.isOAuthAuthorization('Bearer ot_sa_a_b')).toBe(false);
    expect(service.isOAuthAuthorization(undefined)).toBe(false);
  });

  it('resolves a valid token to the user with the grant attached', async () => {
    const service = build({ user: { disabledAt: null }, verified });

    expect(
      await service.tryAuthenticateAuthorizationHeader('Bearer ot_oat_a_b'),
    ).toEqual({
      kind: 'user',
      oauth: { clientId: 'ot_client_x', grantId: 'g-1', scopes: ['mcp:read'] },
      sub: 'u-1',
    });
  });

  describe('when the token must be refused', () => {
    it('refuses an invalid token', async () => {
      const service = build({ user: { disabledAt: null }, verified: null });

      expect(
        await service.tryAuthenticateAuthorizationHeader('Bearer ot_oat_a_b'),
      ).toBeNull();
    });

    it('refuses a token bound to another resource', async () => {
      const service = build({
        user: { disabledAt: null },
        verified: { ...verified, resource: 'https://other.example/mcp' },
      });

      expect(
        await service.tryAuthenticateAuthorizationHeader('Bearer ot_oat_a_b'),
      ).toBeNull();
    });

    it('refuses a disabled user', async () => {
      const service = build({
        user: { disabledAt: new Date('2026-11-01T00:00:00Z') },
        verified,
      });

      expect(
        await service.tryAuthenticateAuthorizationHeader('Bearer ot_oat_a_b'),
      ).toBeNull();
    });

    it('refuses everything while OAuth is not configured', async () => {
      vi.stubEnv('OT_OAUTH_ISSUER', '');
      const service = build({ user: { disabledAt: null }, verified });

      expect(
        await service.tryAuthenticateAuthorizationHeader('Bearer ot_oat_a_b'),
      ).toBeNull();
    });
  });
});
