import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SubscriptionTokenResolver } from './subscription-token.resolver';

const SECRET = 'test-secret';

function makeJwtService(): JwtService {
  return new JwtService({
    secret: SECRET,
    signOptions: { algorithm: 'HS256' },
  });
}

function makeAuthService(jwtService: JwtService, issuer?: string): AuthService {
  const config = {
    get: vi.fn((key: string) => (key === 'JWT_ISSUER' ? issuer : undefined)),
  } as unknown as ConfigService;
  const usersService = {} as never;
  return new AuthService(config, jwtService, usersService);
}

describe('AuthService.signSubscriptionToken', () => {
  it('signs a short-lived token carrying the user id as sub', () => {
    const jwtService = makeJwtService();
    const token = makeAuthService(jwtService).signSubscriptionToken('user-42');
    const decoded = jwtService.verify<{
      exp: number;
      iat: number;
      sub: string;
    }>(token);

    expect(decoded.sub).toBe('user-42');
    // ~5m TTL (allow scheduling slack).
    const ttl = decoded.exp - decoded.iat;
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it('includes the issuer when configured', () => {
    const jwtService = makeJwtService();
    const token = makeAuthService(jwtService, 'openthrottle').signSubscriptionToken('u1'); // prettier-ignore
    const decoded = jwtService.verify<{ sub: string }>(token, {
      issuer: 'openthrottle',
    });
    expect(decoded.sub).toBe('u1');
  });
});

describe('SubscriptionTokenResolver', () => {
  it('mints a token for the authenticated user from the connection context', () => {
    const authService = {
      signSubscriptionToken: vi.fn().mockReturnValue('signed-token'),
    } as unknown as AuthService;
    const resolver = new SubscriptionTokenResolver(authService);

    expect(resolver.mintSubscriptionToken('user-7')).toBe('signed-token');
    expect(authService.signSubscriptionToken).toHaveBeenCalledWith('user-7');
  });
});
