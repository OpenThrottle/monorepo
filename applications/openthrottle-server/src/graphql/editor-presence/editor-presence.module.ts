/**
 * @description GraphQL module for editor-presence detection. Registers
 * EditorPresenceResolver + the cached EditorPresenceService. Kept separate from the
 * workspace-settings module so a probe failure cannot take the settings page with it.
 */
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { EditorPresenceResolver } from './editor-presence.resolver.ts';
import { EditorPresenceService } from './editor-presence.service.ts';

@Module({
  exports: [EditorPresenceService],
  // RolesModule supplies RolesRepository, which GqlPermissionsGuard injects.
  imports: [RolesModule, LoggerModule],
  providers: [
    EditorPresenceResolver,
    EditorPresenceService,
    GqlPermissionsGuard,
  ],
})
export class EditorPresenceGraphqlModule {}
