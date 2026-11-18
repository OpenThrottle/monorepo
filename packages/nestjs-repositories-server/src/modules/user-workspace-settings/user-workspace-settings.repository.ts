import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserWorkspaceSettings } from './user-workspace-settings.entity.ts';
import type { UpdateUserWorkspaceProfileData } from './user-workspace-settings.types.ts';

/**
 * @description Data access for {@link UserWorkspaceSettings}, the per-user workspace profile
 * (contact fields and editor preferences). Keyed by `user_id`, so it is a plain repository rather
 * than a `BaseRepository` (see the package AGENTS.md, natural-key tables).
 * @public
 */
@Injectable()
export class UserWorkspaceSettingsRepository {
  constructor(
    @InjectRepository(UserWorkspaceSettings)
    private readonly repository: Repository<UserWorkspaceSettings>,
  ) {}

  /**
   * @description The user's settings row, or null when they have never saved one. Never inserts.
   */
  async findByUserId(userId: string): Promise<UserWorkspaceSettings | null> {
    return this.repository.findOne({ where: { userId } });
  }

  /**
   * @description Loads workspace settings for a user, creating an empty row when missing.
   */
  async getOrCreateForUser(userId: string): Promise<UserWorkspaceSettings> {
    const existing = await this.findByUserId(userId);
    if (existing !== null) {
      return existing;
    }

    const created = this.repository.create({
      contactDisplayName: null,
      contactEmail: null,
      enabledEditors: [],
      userId,
    });

    return this.repository.save(created);
  }

  /**
   * @description Updates workspace profile fields (contact and/or enabled editors), creating the
   * row first when missing. Absent keys are left unchanged.
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
   * @description Use {@link updateProfile} instead.
   * @deprecated
   */
  async updateContactProfile(
    userId: string,
    data: UpdateUserWorkspaceProfileData,
  ): Promise<UserWorkspaceSettings> {
    return this.updateProfile(userId, data);
  }
}
