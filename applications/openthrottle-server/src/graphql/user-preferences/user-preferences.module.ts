/**
 * @description Registers the userPreferences query and updateUserPreferences mutation.
 */

import './user-preferences.object.ts';
import './user-preferences.input.ts';

import { Module } from '@nestjs/common';
import {
  NestjsRepositoriesServerModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UserPreferencesResolver } from './user-preferences.resolver.ts';

@Module({
  imports: [RolesModule, NestjsRepositoriesServerModule],
  providers: [GqlPermissionsGuard, UserPreferencesResolver],
})
export class UserPreferencesGraphqlModule {}
