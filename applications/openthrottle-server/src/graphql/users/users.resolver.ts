/**
 * @description Resolver for User queries and mutations. Injects UsersRepository from @openthrottle/nestjs-repositories and maps User entities to UserObject.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { Permissions } from '@openthrottle/nestjs-rbac';
import type { User } from '@openthrottle/nestjs-repositories-server';
import { UsersRepository } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CreateUserInput, UpdateUserInput } from './user.input.ts';
import { UserObject } from './user.object.ts';
import { nullIfNotFound } from './users.utils.ts';

@Resolver(() => UserObject)
@UseGuards(GqlPermissionsGuard)
export class UsersResolver {
  constructor(private readonly usersRepository: UsersRepository) {}

  // @ProfileResponseTime('UsersResolver.user')
  @Query(() => UserObject, {
    description: `Get a user by ID`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async user(@Args('id', { type: () => ID }) id: string): Promise<User | null> {
    const entity = await this.usersRepository.findOne({ where: { id } });

    return entity;
  }

  // @ProfileResponseTime('UsersResolver.me')
  @Query(() => UserObject, {
    description: `Get the currently authenticated user`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async me(@CurrentUser('sub') userId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id: userId } });
  }

  // @ProfileResponseTime('UsersResolver.users')
  @Query(() => [UserObject], {
    description: `List all users, ordered by createdAt descending`,
  })
  @Permissions(PERMISSIONS.USERS_READ)
  async users(): Promise<User[]> {
    const entities = await this.usersRepository.findAll();

    return entities;
  }

  // @ProfileResponseTime('UsersResolver.createUser')
  @Mutation(() => UserObject, {
    description: `Create a user`,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async createUser(
    @Args('input', { type: () => CreateUserInput }) input: CreateUserInput,
  ): Promise<User> {
    const entity = await this.usersRepository.create({
      email: input.email ?? null,
      githubUsername: input.githubUsername,
    });

    return entity;
  }

  // @ProfileResponseTime('UsersResolver.updateUser')
  @Mutation(() => UserObject, {
    description: `Update a user`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async updateUser(
    @Args('input', { type: () => UpdateUserInput }) input: UpdateUserInput,
  ): Promise<User | null> {
    return nullIfNotFound(async () => {
      return this.usersRepository.update(input.id, {
        ...(input.disabledAt !== undefined && {
          disabledAt: input.disabledAt,
        }),
        ...(input.githubUsername != null && {
          githubUsername: input.githubUsername,
        }),
        ...(input.email !== undefined && { email: input.email }),
      });
    });
  }

  // @ProfileResponseTime('UsersResolver.disableUser')
  @Mutation(() => UserObject, {
    description: `Disable a user; they will not be able to log in.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async disableUser(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<User | null> {
    return nullIfNotFound(async () => {
      return this.usersRepository.disable(id);
    });
  }

  // @ProfileResponseTime('UsersResolver.enableUser')
  @Mutation(() => UserObject, {
    description: `Re-enable a disabled user.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.USERS_WRITE)
  async enableUser(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<User | null> {
    return nullIfNotFound(async () => {
      return this.usersRepository.enable(id);
    });
  }
}
