import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  isUniqueViolation,
} from '@openthrottle/nestjs-postgres';
import { DEFAULT_TAG_VOCABULARY_SEED } from '@openthrottle/openthrottle-skills';
import { Repository } from 'typeorm';

import {
  assertKebabCaseTag,
  assertKnownDimension,
  normalizeTag,
} from './tag-slug/tag-slug.utils.ts';
import { UserSkillTag } from './user-skill-tag.entity.ts';

/**
 * @description Data access for the openthrottle `user_skill_tags` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes) plus the per-user vocabulary. The
 * vocabulary is DB-authoritative and seeded on first read: {@link SkillTagsRepository.listForUser}
 * seeds the platform defaults for a user with zero rows. Adds and renames validate the tag as a
 * kebab-case slug and turn a duplicate into a `ConflictException`.
 * See docs/monorepo/skill-availability-design.md ("Tags").
 * @public
 */
@Injectable()
export class SkillTagsRepository extends BaseRepository<
  UserSkillTag,
  CreateModelInput<UserSkillTag>
> {
  protected readonly tableName = 'user_skill_tags';

  constructor(
    @InjectRepository(UserSkillTag)
    repository: Repository<UserSkillTag>,
  ) {
    super(repository);
  }

  /**
   * @description Lists the user's skill-tag vocabulary, alphabetically by tag. If the user has
   * zero rows, seeds the platform-default vocabulary for that user first.
   */
  async listForUser(userId: string): Promise<UserSkillTag[]> {
    const existing = await this.findBy({
      order: { tag: 'ASC' },
      where: { userId },
    });
    if (existing.length > 0) {
      return existing;
    }

    await this.seedDefaults(userId);
    return this.findBy({ order: { tag: 'ASC' }, where: { userId } });
  }

  /**
   * @description Adds a tag to the user's vocabulary. `dimension` defaults to `domain`; pass
   * `phase` for lifecycle-stage tags (plans and tasks only).
   * @throws BadRequestException for a non-kebab-case tag or an unknown dimension.
   * @throws ConflictException when the user already has the tag.
   */
  async addTag(
    userId: string,
    tag: string,
    dimension: string = 'domain',
  ): Promise<UserSkillTag> {
    const normalized = normalizeTag(tag);
    assertKebabCaseTag(normalized);
    assertKnownDimension(dimension);

    try {
      return await this.create({ dimension, tag: normalized, userId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Tag "${normalized}" is already in your skill-tag vocabulary.`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  /**
   * @description Renames a tag in the user's vocabulary; renaming to the same tag is a no-op.
   * @throws BadRequestException for a non-kebab-case target.
   * @throws NotFoundException when the source tag is absent.
   * @throws ConflictException when the target tag already exists.
   */
  async renameTag(
    userId: string,
    from: string,
    to: string,
  ): Promise<UserSkillTag> {
    const normalizedTo = normalizeTag(to);
    assertKebabCaseTag(normalizedTo);

    const existing = await this.findOne({ where: { tag: from, userId } });
    if (!existing) {
      throw new NotFoundException(
        `Tag "${from}" is not in your skill-tag vocabulary.`,
      );
    }

    if (normalizedTo === existing.tag) {
      return existing;
    }

    try {
      return await this.update(existing.id, { tag: normalizedTo });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Tag "${normalizedTo}" is already in your skill-tag vocabulary.`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  /**
   * @description Removes a tag from the user's vocabulary. Returns false when the tag was not
   * present.
   */
  async removeTag(userId: string, tag: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ tag, userId });
    return removedCount > 0;
  }

  /**
   * @description Seeds the platform-default vocabulary for a user idempotently (`ON CONFLICT DO
   * NOTHING`), skipping any tags the user already has.
   */
  private async seedDefaults(userId: string): Promise<void> {
    const rows = DEFAULT_TAG_VOCABULARY_SEED.map(({ dimension, tag }) => {
      return { dimension, tag, userId };
    });
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(UserSkillTag)
      .values(rows)
      .orIgnore()
      .execute();
  }
}
