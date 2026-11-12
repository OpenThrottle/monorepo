/**
 * @description Registers the userPreferences query and updateUserPreferences mutation.
 */

import './user-preferences.object.ts';
import './user-preferences.input.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UserPreferencesResolver } from './user-preferences.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, UserPreferencesResolver],
})
export class UserPreferencesGraphqlModule {}
