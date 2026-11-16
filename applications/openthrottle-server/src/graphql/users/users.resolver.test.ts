import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  OAuthService,
  RolesRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { UsersRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRolesRepositoryMock,
  createUsersRepositoryMock,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UsersResolver } from './users.resolver.ts';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let mockOAuthService: { readonly revokeGrantsForUser: Mock };
  let users: UsersRepositoryMock;

  const mockUser = usersFactory.build({
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    disabledAt: null,
    email: 'user@example.com',
    githubUsername: 'visormatt',
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    passwordHash: null,
    updatedAt: new Date('2026-02-02T10:00:00.000Z'),
  });

  const notFound = new NotFoundException('users record not found');

  beforeEach(async () => {
    mockOAuthService = { revokeGrantsForUser: vi.fn() };
    users = createUsersRepositoryMock();
    const app = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersRepository, useValue: users },
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: RolesRepository, useValue: createRolesRepositoryMock() },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<UsersResolver>(UsersResolver);
  });

  describe('user', () => {
    test('returns UserObject when user exists', async () => {
      users.findOne.mockResolvedValue(mockUser);

      const result = await resolver.user(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.githubUsername).toBe(mockUser.githubUsername);
      expect(result?.email).toBe(mockUser.email);
      expect(users.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    test('returns null when user does not exist', async () => {
      users.findOne.mockResolvedValue(null);

      const result = await resolver.user('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('me', () => {
    test('returns UserObject when user exists', async () => {
      users.findOne.mockResolvedValue(mockUser);

      const result = await resolver.me(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.githubUsername).toBe(mockUser.githubUsername);
      expect(result?.email).toBe(mockUser.email);
    });

    test('returns null when user not found', async () => {
      users.findOne.mockResolvedValue(null);

      const result = await resolver.me('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('users', () => {
    test('returns array of UserObjects', async () => {
      users.findAll.mockResolvedValue([mockUser]);

      const result = await resolver.users();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockUser.id);
      expect(result[0]?.githubUsername).toBe(mockUser.githubUsername);
    });

    test('returns empty array when no users', async () => {
      users.findAll.mockResolvedValue([]);

      const result = await resolver.users();

      expect(result).toEqual([]);
    });
  });

  describe('createUser', () => {
    test('returns UserObject after create', async () => {
      users.create.mockResolvedValue(mockUser);

      const result = await resolver.createUser({
        email: mockUser.email,
        githubUsername: mockUser.githubUsername,
      });

      expect(result.id).toBe(mockUser.id);
      expect(result.githubUsername).toBe(mockUser.githubUsername);
    });
  });

  describe('updateUser', () => {
    test('returns UserObject when user exists', async () => {
      users.update.mockResolvedValue(mockUser);

      const result = await resolver.updateUser({
        disabledAt: undefined,
        email: null,
        githubUsername: 'new-username',
        id: mockUser.id,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
    });

    test('returns null when user does not exist', async () => {
      users.update.mockRejectedValue(notFound);

      const result = await resolver.updateUser({
        disabledAt: undefined,
        email: null,
        githubUsername: 'new-username',
        id: 'non-existent-id',
      });

      expect(result).toBeNull();
    });
  });

  describe('disableUser', () => {
    test('returns UserObject when user is disabled', async () => {
      const disabledUser = {
        ...mockUser,
        disabledAt: new Date('2026-02-02T12:00:00.000Z'),
      };
      users.disable.mockResolvedValue(disabledUser);

      const result = await resolver.disableUser(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.disabledAt).toEqual(new Date('2026-02-02T12:00:00.000Z'));
      expect(mockOAuthService.revokeGrantsForUser).toHaveBeenCalledWith(
        mockUser.id,
        'user_disabled',
        expect.any(Date),
      );
    });

    test('returns null when user does not exist', async () => {
      users.disable.mockRejectedValue(notFound);

      const result = await resolver.disableUser('non-existent-id');

      expect(result).toBeNull();
      expect(mockOAuthService.revokeGrantsForUser).not.toHaveBeenCalled();
    });
  });

  describe('enableUser', () => {
    test('returns UserObject when user is re-enabled', async () => {
      users.enable.mockResolvedValue(mockUser);

      const result = await resolver.enableUser(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.disabledAt).toBeNull();
    });

    test('returns null when user does not exist', async () => {
      users.enable.mockRejectedValue(notFound);

      const result = await resolver.enableUser('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
