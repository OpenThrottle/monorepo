/**
 * @description Per-user workspace profile (contact fields and editor preferences).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import type { WorkspaceEditorId } from './workspace-editor-id';
import { UserWorkspaceSettings } from './user-workspace-settings.entity';

interface UpdateUserWorkspaceProfileData {
  readonly contactDisplayName?: string | null;
  readonly contactEmail?: string | null;
  readonly enabledEditors?: readonly WorkspaceEditorId[];
}

@Injectable()
export class UserWorkspaceSettingsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(UserWorkspaceSettings)
    private readonly repository: Repository<UserWorkspaceSettings>,
  ) {
    this.logger.debug('🧩 user-workspace-settings 🧩');
  }

  /**
   * @description Returns the TypeORM repository for user workspace settings.
   */
  getRepository(): Repository<UserWorkspaceSettings> {
    return this.repository;
  }

  /**
   * @description Loads workspace settings for a user, creating an empty row when missing.
   */
  async getOrCreateForUser(userId: string): Promise<UserWorkspaceSettings> {
    const existing = await this.repository.findOne({ where: { userId } });
    if (existing) return existing;

    const created = this.repository.create({
      contactDisplayName: null,
      contactEmail: null,
      enabledEditors: [],
      userId,
    });

    return this.repository.save(created);
  }

  /**
   * @description Updates workspace profile fields (contact and/or enabled editors).
   */
  async updateProfile(
    userId: string,
    data: UpdateUserWorkspaceProfileData,
  ): Promise<UserWorkspaceSettings> {
    const settings = await this.getOrCreateForUser(userId);

    if (data.contactDisplayName !== undefined) {
      settings.contactDisplayName = data.contactDisplayName;
    }
    if (data.contactEmail !== undefined) {
      settings.contactEmail = data.contactEmail;
    }
    if (data.enabledEditors !== undefined) {
      settings.enabledEditors = [...data.enabledEditors];
    }

    return this.repository.save(settings);
  }

  /**
   * @description @deprecated Use {@link updateProfile} instead.
   */
  async updateContactProfile(
    userId: string,
    data: UpdateUserWorkspaceProfileData,
  ): Promise<UserWorkspaceSettings> {
    return this.updateProfile(userId, data);
  }
}
