import { NotFoundException } from '@nestjs/common';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { User } from './user.entity.ts';
import type { UserCreateInput, UsersRepositoryMock } from './users.types.ts';

/**
 * @description Builds a {@link UsersRepositoryMock} that starts as an empty `users` table
 * (see `createBaseRepositoryMock`). `disable` and `enable` reject with the not-found error,
 * like the real repository on a missing id. Provide it in place of `UsersRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createUsersRepositoryMock(): UsersRepositoryMock {
  const notFound = (id: string): Promise<never> => {
    return Promise.reject(
      new NotFoundException(`users record with ID "${id}" not found`),
    );
  };

  return {
    ...createBaseRepositoryMock<User, UserCreateInput>('users'),
    disable: vi.fn(notFound),
    enable: vi.fn(notFound),
    findAll: vi.fn(async () => {
      return [];
    }),
    findByEmail: vi.fn(async () => {
      return null;
    }),
    findByGithubUsername: vi.fn(async () => {
      return null;
    }),
  };
}
