/**
 * @description GraphQL resolver for the authenticated user's preferences. Every operation is
 * scoped to the caller's own row via `@CurrentUser('sub')`; there is no userId argument.
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { UserPreferencesService } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UpdateUserPreferencesInput } from './user-preferences.input.ts';
import {
  toUpdateUserPreferencesPatch,
  toUserPreferencesGraphqlError,
  toUserPreferencesObject,
} from './user-preferences.mapper.ts';
import { UserPreferencesObject } from './user-preferences.object.ts';

@Resolver(() => UserPreferencesObject)
@UseGuards(GqlPermissionsGuard)
export class UserPreferencesResolver {
  constructor(
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  @Query(() => UserPreferencesObject, {
    description: `Preferences for the authenticated user. All fields are null until the user saves one.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async userPreferences(
    @CurrentUser('sub') userId: string,
  ): Promise<UserPreferencesObject> {
    const data = await this.userPreferencesService.getForUser(userId);
    return toUserPreferencesObject(data);
  }

  @Mutation(() => UserPreferencesObject, {
    description: `Update the authenticated user's preferences. An omitted field is left unchanged; an explicit null clears it to the system default.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateUserPreferences(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => UpdateUserPreferencesInput })
    input: UpdateUserPreferencesInput,
  ): Promise<UserPreferencesObject> {
    const result = await this.userPreferencesService.update(
      userId,
      toUpdateUserPreferencesPatch(input),
    );
    if (!result.ok) {
      throw toUserPreferencesGraphqlError(result);
    }
    return toUserPreferencesObject(result.preferences);
  }
}
