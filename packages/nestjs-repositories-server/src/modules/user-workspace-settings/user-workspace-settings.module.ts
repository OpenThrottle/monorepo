import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserWorkspaceSettings } from './user-workspace-settings.entity.ts';
import { UserWorkspaceSettingsRepository } from './user-workspace-settings.repository.ts';

/**
 * @description Registers {@link UserWorkspaceSettings} on the default connection and provides
 * {@link UserWorkspaceSettingsRepository}.
 * @public
 */
@Module({
  exports: [UserWorkspaceSettingsRepository],
  imports: [TypeOrmModule.forFeature([UserWorkspaceSettings])],
  providers: [UserWorkspaceSettingsRepository],
})
export class UserWorkspaceSettingsModule {}
