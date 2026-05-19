/**
 * @description Per-user workspace profile (contact fields and editor preferences).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { UserWorkspaceSettings } from './user-workspace-settings.entity';

export interface UpdateUserWorkspaceContactProfileData {
  readonly contactDisplayName?: string | null;
  readonly contactEmail?: string | null;
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
   * @description Updates contact display name and/or email on the user's workspace profile.
   */
  async updateContactProfile(
    userId: string,
    data: UpdateUserWorkspaceContactProfileData,
  ): Promise<UserWorkspaceSettings> {
    const settings = await this.getOrCreateForUser(userId);

    if (data.contactDisplayName !== undefined) {
      settings.contactDisplayName = data.contactDisplayName;
    }
    if (data.contactEmail !== undefined) {
      settings.contactEmail = data.contactEmail;
    }

    return this.repository.save(settings);
  }
}
