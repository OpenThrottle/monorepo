/**
 * @description Applies each user's editor preferences to their registered checkouts.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  RepositoryCheckoutsModule,
  UserWorkspaceSettingsModule,
} from '@openthrottle/nestjs-repositories-server';

import { WorkspaceEditorConfigService } from './workspace-editor-config.service.ts';

@Module({
  exports: [WorkspaceEditorConfigService],
  imports: [
    LoggerModule,
    RepositoryCheckoutsModule,
    UserWorkspaceSettingsModule,
  ],
  providers: [WorkspaceEditorConfigService],
})
export class WorkspaceEditorConfigModule {}
