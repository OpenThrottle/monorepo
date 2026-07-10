/**
 * @description Unit tests for auth resolver: login, signout, and register mutations.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { usersFactory } from '@openthrottle/nestjs-repositories';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  const mockUser = usersFactory.build({
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    disabledAt: null,
    email: 'user@example.com',
    githubUsername: 'visormatt',
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    updatedAt: new Date('2026-02-02T10:00:00.000Z'),
  });

  const mockAuthService = createMock<AuthService>({
    login: vi.fn(),
    register: vi.fn(),
    signout: vi.fn(),
  });

  const mockLogger = createMock<LoggerService>({
    info: vi.fn(),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    resolver = app.get<AuthResolver>(AuthResolver);
  });

  describe('login', () => {
    test('returns access token from AuthService.login for validated user', async () => {
      vi.mocked(mockAuthService.login).mockResolvedValueOnce({
        accessToken: 'jwt-token',
      });

      const result = await resolver.login(
        { email: mockUser.email ?? '', password: 'secret' },
        { req: { user: mockUser } },
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('signout', () => {
    test('returns success from AuthService.signout', async () => {
      vi.mocked(mockAuthService.signout).mockResolvedValueOnce({
        success: true,
      });

      const result = await resolver.signout();

      expect(mockAuthService.signout).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: true });
    });
  });

  describe('register', () => {
    test('returns register result and logs registration', async () => {
      const registerResult = {
        accessToken: 'new-jwt',
        email: 'new@example.com',
        id: 'new-user-id',
      };
      vi.mocked(mockAuthService.register).mockResolvedValueOnce(registerResult);

      const input = {
        email: 'new@example.com',
        password: 'secret123',
      };

      const result = await resolver.register(input);

      expect(mockAuthService.register).toHaveBeenCalledWith(input);
      expect(mockLogger.info).toHaveBeenCalledWith('📝 register', {
        email: registerResult.email,
        id: registerResult.id,
      });
      expect(result).toEqual(registerResult);
    });
  });
});
