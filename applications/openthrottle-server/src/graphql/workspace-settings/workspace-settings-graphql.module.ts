/**
 * @description Registers workspace settings GraphQL types and local repository CRUD.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import './workspace-editor-id.enum';
import './user-workspace-profile.object';
import './workspace-local-repository.object';
import './workspace-settings.object';
import './workspace-settings.input';
import { WorkspaceSettingsResolver } from './workspace-settings.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, WorkspaceSettingsResolver],
})
export class WorkspaceSettingsGraphqlModule {}
