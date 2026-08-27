/**
 * @description GraphQL module for editor-presence detection. Registers
 * EditorPresenceResolver + the cached EditorPresenceService. Kept separate from the
 * workspace-settings module so a probe failure cannot take the settings page with it.
 */
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { EditorPresenceResolver } from './editor-presence.resolver';
import { EditorPresenceService } from './editor-presence.service';

@Module({
  exports: [EditorPresenceService],
  // NestjsRepositoriesModule supplies RolesService, which GqlPermissionsGuard injects.
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [
    EditorPresenceResolver,
    EditorPresenceService,
    GqlPermissionsGuard,
  ],
})
export class EditorPresenceGraphqlModule {}
