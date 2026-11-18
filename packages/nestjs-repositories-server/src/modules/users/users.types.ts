import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { User } from './user.entity.ts';
import type { UsersRepository } from './users.repository.ts';

/**
 * Scalar/column fields of User (no relations, no `deletedAt`). Use to type GraphQL objects or
 * DTOs that mirror the entity.
 * @public
 */
export type UserData = Pick<
  User,
  | 'createdAt'
  | 'disabledAt'
  | 'email'
  | 'githubUsername'
  | 'id'
  | 'passwordHash'
  | 'updatedAt'
>;

/**
 * @description What `UsersRepository.create` takes: the user's columns, with the roles
 * relation left out and the nullable columns optional. `githubUsername` is required.
 * @public
 */
export interface UserCreateInput
  extends
    Omit<
      CreateModelInput<User>,
      'disabledAt' | 'email' | 'passwordHash' | 'roles'
    >,
    Partial<
      Pick<CreateModelInput<User>, 'disabledAt' | 'email' | 'passwordHash'>
    > {}

/**
 * @description A {@link UsersRepository} mock: every inherited `BaseRepository` method plus
 * the user ones.
 * @public
 */
export interface UsersRepositoryMock extends BaseRepositoryMock<
  User,
  UserCreateInput
> {
  readonly disable: Mock<UsersRepository['disable']>;
  readonly enable: Mock<UsersRepository['enable']>;
  readonly findAll: Mock<UsersRepository['findAll']>;
  readonly findByEmail: Mock<UsersRepository['findByEmail']>;
  readonly findByGithubUsername: Mock<UsersRepository['findByGithubUsername']>;
}
