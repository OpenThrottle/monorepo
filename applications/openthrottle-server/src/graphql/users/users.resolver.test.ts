import { RolesService, UsersService } from '@openthrottle/nestjs-repositories';
import type { User } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { UsersResolver } from './users.resolver';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: UsersService;

  const mockUser: User = {
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    disabledAt: null,
    email: 'user@example.com',
    githubUsername: 'visormatt',
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    passwordHash: null,
    roles: [],
    updatedAt: new Date('2026-02-02T10:00:00.000Z'),
  };

  const mockUsersService = createMock<UsersService>();

  beforeAll(async () => {
    const mockRolesService = createMock<RolesService>({
      getPermissionsForUser: vi
        .fn()
        .mockResolvedValue(['users:read', 'users:write']),
    });
    const app = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: mockUsersService },
        { provide: RolesService, useValue: mockRolesService },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<UsersResolver>(UsersResolver);
    usersService = app.get<UsersService>(UsersService);
  });

  describe('user', () => {
    test('returns UserObject when user exists', async () => {
      vi.mocked(usersService.findById).mockResolvedValue(mockUser);

      const result = await resolver.user(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.githubUsername).toBe(mockUser.githubUsername);
      expect(result?.email).toBe(mockUser.email);
    });

    test('returns null when user does not exist', async () => {
      vi.mocked(usersService.findById).mockResolvedValue(null);

      const result = await resolver.user('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('me', () => {
    test('returns UserObject when user exists', async () => {
      vi.mocked(usersService.findById).mockResolvedValue(mockUser);

      const result = await resolver.me(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.githubUsername).toBe(mockUser.githubUsername);
      expect(result?.email).toBe(mockUser.email);
    });

    test('returns null when user not found', async () => {
      vi.mocked(usersService.findById).mockResolvedValue(null);

      const result = await resolver.me('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('users', () => {
    test('returns array of UserObjects', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue([mockUser]);

      const result = await resolver.users();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockUser.id);
      expect(result[0]?.githubUsername).toBe(mockUser.githubUsername);
    });

    test('returns empty array when no users', async () => {
      vi.mocked(usersService.findAll).mockResolvedValue([]);

      const result = await resolver.users();

      expect(result).toEqual([]);
    });
  });

  describe('createUser', () => {
    test('returns UserObject after create', async () => {
      vi.mocked(usersService.create).mockResolvedValue(mockUser);

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
      vi.mocked(usersService.update).mockResolvedValue(mockUser);

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
      vi.mocked(usersService.update).mockResolvedValue(null);

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
      vi.mocked(usersService.disable).mockResolvedValue(disabledUser);

      const result = await resolver.disableUser(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.disabledAt).toEqual(new Date('2026-02-02T12:00:00.000Z'));
    });

    test('returns null when user does not exist', async () => {
      vi.mocked(usersService.disable).mockResolvedValue(null);

      const result = await resolver.disableUser('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('enableUser', () => {
    test('returns UserObject when user is re-enabled', async () => {
      vi.mocked(usersService.enable).mockResolvedValue(mockUser);

      const result = await resolver.enableUser(mockUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.disabledAt).toBeNull();
    });

    test('returns null when user does not exist', async () => {
      vi.mocked(usersService.enable).mockResolvedValue(null);

      const result = await resolver.enableUser('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
