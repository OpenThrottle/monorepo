/**
 * @description Unit tests for AuthService: JWT issuance (login + subscription token),
 * signout acknowledgement, and registration (conflict, username derivation, token issuance).
 */

import { createMock } from '@golevelup/ts-vitest';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@openthrottle/nestjs-repositories';
import type { User } from '@openthrottle/nestjs-repositories';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthService } from './auth.service';

const mockUser: User = {
  createdAt: new Date('2026-02-02T10:00:00.000Z'),
  disabledAt: null,
  email: 'user@example.com',
  githubUsername: 'visormatt',
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  updatedAt: new Date('2026-02-02T10:00:00.000Z'),
} as User;

describe('AuthService', () => {
  let service: AuthService;
  let configService: ConfigService;
  let jwtService: JwtService;
  let usersService: UsersService;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({ get: vi.fn() }),
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>({ sign: vi.fn() }),
        },
        {
          provide: UsersService,
          useValue: createMock<UsersService>({
            create: vi.fn(),
            findByEmail: vi.fn(),
            hashPassword: vi.fn(),
          }),
        },
      ],
    }).compile();

    service = app.get<AuthService>(AuthService);
    configService = app.get<ConfigService>(ConfigService);
    jwtService = app.get<JwtService>(JwtService);
    usersService = app.get<UsersService>(UsersService);
  });

  describe('login', () => {
    test('signs a token with issuer + 24h expiry when JWT_ISSUER is set', async () => {
      vi.mocked(configService.get).mockReturnValue('openthrottle');
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');

      const result = await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: mockUser.email, sub: mockUser.id },
        { expiresIn: '24h', issuer: 'openthrottle' },
      );
      expect(result).toEqual({ accessToken: 'signed-jwt' });
    });

    test('omits issuer from sign options when JWT_ISSUER is unset', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');

      await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: mockUser.email, sub: mockUser.id },
        { expiresIn: '24h' },
      );
    });

    test('passes undefined email in the payload when the user has no email', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');

      await service.login({ ...mockUser, email: null } as User);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: undefined, sub: mockUser.id },
        { expiresIn: '24h' },
      );
    });
  });

  describe('signout', () => {
    test('acknowledges with success true', async () => {
      await expect(service.signout()).resolves.toEqual({ success: true });
    });
  });

  describe('signSubscriptionToken', () => {
    test('signs a short-lived token with issuer when JWT_ISSUER is set', () => {
      vi.mocked(configService.get).mockReturnValue('openthrottle');
      vi.mocked(jwtService.sign).mockReturnValue('sub-jwt');

      const token = service.signSubscriptionToken(mockUser.id);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        { expiresIn: '5m', issuer: 'openthrottle' },
      );
      expect(token).toBe('sub-jwt');
    });

    test('omits issuer when JWT_ISSUER is unset', () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('sub-jwt');

      service.signSubscriptionToken(mockUser.id);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        { expiresIn: '5m' },
      );
    });
  });

  describe('register', () => {
    test('throws ConflictException when the email is already registered', async () => {
      vi.mocked(usersService.findByEmail).mockResolvedValue(mockUser);

      await expect(
        service.register({ email: mockUser.email ?? '', password: 'secret' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    test('creates a user, hashes the password, and returns id/email/token', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      vi.mocked(usersService.hashPassword).mockResolvedValue('hashed');
      vi.mocked(usersService.create).mockResolvedValue(mockUser);

      const result = await service.register({
        email: mockUser.email ?? '',
        githubUsername: 'visormatt',
        password: 'secret',
      });

      expect(usersService.hashPassword).toHaveBeenCalledWith('secret');
      expect(usersService.create).toHaveBeenCalledTimes(1);
      const createArg = vi.mocked(usersService.create).mock.calls[0][0];
      expect(createArg.email).toBe(mockUser.email);
      expect(createArg.passwordHash).toBe('hashed');
      expect(createArg.githubUsername).toMatch(/^visormatt-[0-9a-f]{8}$/);

      expect(result).toEqual({
        accessToken: 'signed-jwt',
        email: mockUser.email,
        id: mockUser.id,
      });
    });

    test('derives the github username base from the email local part when none is provided', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      vi.mocked(usersService.hashPassword).mockResolvedValue('hashed');
      vi.mocked(usersService.create).mockResolvedValue(mockUser);

      await service.register({ email: 'jane.doe@example.com', password: 'pw' });

      const createArg = vi.mocked(usersService.create).mock.calls[0][0];
      expect(createArg.githubUsername).toMatch(/^jane\.doe-[0-9a-f]{8}$/);
    });

    test('falls back to the literal "user" base when email local part is empty', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      vi.mocked(usersService.hashPassword).mockResolvedValue('hashed');
      vi.mocked(usersService.create).mockResolvedValue(mockUser);

      await service.register({ email: '@example.com', password: 'pw' });

      const createArg = vi.mocked(usersService.create).mock.calls[0][0];
      expect(createArg.githubUsername).toMatch(/^user-[0-9a-f]{8}$/);
    });

    test('uses the input email in the result when the created user has no email', async () => {
      vi.mocked(configService.get).mockReturnValue(undefined);
      vi.mocked(jwtService.sign).mockReturnValue('signed-jwt');
      vi.mocked(usersService.findByEmail).mockResolvedValue(null);
      vi.mocked(usersService.hashPassword).mockResolvedValue('hashed');
      vi.mocked(usersService.create).mockResolvedValue({
        ...mockUser,
        email: null,
      } as User);

      const result = await service.register({
        email: 'fallback@example.com',
        password: 'pw',
      });

      expect(result.email).toBe('fallback@example.com');
    });
  });
});
