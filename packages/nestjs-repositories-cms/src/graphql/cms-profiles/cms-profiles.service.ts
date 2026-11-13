import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from '../../modules/profiles/profile.entity.ts';
import { CMS_PROFILE_PLACEHOLDER_EMAIL_DOMAIN } from '../cms-write-access/cms-write-access.constants.ts';
import type { CmsUserWriter } from '../cms-write-access/cms-write-access.types.ts';

/** Postgres SQLSTATE for a unique-constraint violation. */
const UNIQUE_VIOLATION = '23505';

/**
 * @description Resolves the cms profile of an OpenThrottle user, by `openthrottle_user_id`
 * (a by-value link to the openthrottle database; see databases/cms/README.md § profile identity).
 * @public
 */
@Injectable()
export class CmsProfilesService {
  constructor(
    @InjectRepository(Profile, CMS_CONNECTION)
    private readonly profiles: Repository<Profile>,
  ) {}

  /**
   * @description The user's profile, created on first use and restored if it was soft deleted.
   * Safe under concurrency: a racing insert loses on the unique index and re-reads the winner.
   */
  async resolveForUser(writer: CmsUserWriter): Promise<Profile> {
    const existing = await this.findByUser(writer.userId);

    if (existing) {
      return this.restore(existing);
    }

    try {
      return await this.profiles.save(
        this.profiles.create({
          email:
            writer.email ??
            `${writer.userId}@${CMS_PROFILE_PLACEHOLDER_EMAIL_DOMAIN}`,
          openthrottleUserId: writer.userId,
        }),
      );
    } catch (error) {
      const isRace = readErrorCode(error) === UNIQUE_VIOLATION;
      const winner = isRace ? await this.findByUser(writer.userId) : null;

      if (!winner) {
        throw error;
      }

      return this.restore(winner);
    }
  }

  private async findByUser(userId: string): Promise<Profile | null> {
    return this.profiles.findOne({ where: { openthrottleUserId: userId } });
  }

  private async restore(profile: Profile): Promise<Profile> {
    if (profile.isDeleted !== true) {
      return profile;
    }

    profile.isDeleted = false;

    return this.profiles.save(profile);
  }
}

/**
 * @description The SQLSTATE a pg driver error carries, if any.
 */
function readErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  return Reflect.get(error, 'code');
}
