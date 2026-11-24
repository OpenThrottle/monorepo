import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  emptyUserPreferences,
  toUserPreferencesData,
  validateUserPreferencesPatch,
} from './preferences-patch/preferences-patch.utils.ts';
import { UserPreferences } from './user-preferences.entity.ts';
import type {
  UpdateUserPreferencesPatch,
  UpdateUserPreferencesResult,
  UserPreferencesData,
} from './user-preferences.types.ts';

/**
 * @description Per-user preferences (default editor, default agent). Keyed by `user_id`, so it is
 * a plain repository rather than a `BaseRepository` (see the package AGENTS.md, natural-key
 * tables). Reads never write: a user without a row gets the all-NULL value. Updates validate
 * first and return a result type, so an invalid value is a normal outcome for the caller rather
 * than a thrown error.
 * @public
 */
@Injectable()
export class UserPreferencesRepository {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly repository: Repository<UserPreferences>,
  ) {}

  /**
   * @description The user's preferences, or all-NULL when they have never saved one. Never inserts.
   */
  async getForUser(userId: string): Promise<UserPreferencesData> {
    const row = await this.repository.findOne({ where: { userId } });
    if (row === null) {
      return emptyUserPreferences(userId);
    }
    return toUserPreferencesData(row);
  }

  /**
   * @description Validates and upserts a patch. Absent keys are left unchanged; `null` clears.
   * Clearing the default agent clears its effort too. Nothing is written when validation fails.
   */
  async update(
    userId: string,
    patch: UpdateUserPreferencesPatch,
  ): Promise<UpdateUserPreferencesResult> {
    const validation = validateUserPreferencesPatch(patch);
    if (!validation.ok) {
      return validation;
    }
    const { defaultAgent, defaultEditor } = validation.patch;

    const existing = await this.repository.findOne({ where: { userId } });
    const row =
      existing ??
      this.repository.create({
        defaultAgentDriver: null,
        defaultAgentEffort: null,
        defaultAgentModel: null,
        defaultEditor: null,
        userId,
      });

    if (defaultEditor !== undefined) {
      row.defaultEditor = defaultEditor;
    }
    if (defaultAgent !== undefined) {
      row.defaultAgentDriver = defaultAgent?.driver ?? null;
      row.defaultAgentEffort = defaultAgent?.effort ?? null;
      row.defaultAgentModel = defaultAgent?.model ?? null;
    }

    const saved = await this.repository.save(row);
    return { ok: true, preferences: toUserPreferencesData(saved) };
  }
}
