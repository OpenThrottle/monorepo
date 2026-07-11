/**
 * @description CRUD for the per-user skill-tag vocabulary (user_skill_tags).
 *
 * The vocabulary is DB-authoritative and seeded on first read: `listForUser`
 * seeds the platform-default `DEFAULT_SKILL_TAG_VOCABULARY` for a user that has
 * zero rows, then returns. Adds/renames/removes are user-scoped and validate the
 * tag as a kebab-case slug (AGENT_ASSET_SLUG_PATTERN) with actionable errors.
 * See docs/monorepo/skill-availability-design.md ("Tags").
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  AGENT_ASSET_SLUG_PATTERN,
  DEFAULT_SKILL_TAG_VOCABULARY,
} from '@openthrottle/openthrottle-skills';
import { QueryFailedError, Repository } from 'typeorm';
import { UserSkillTag } from './user-skill-tag.entity';

const isUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
};

const normalizeTag = (tag: string): string => tag.trim();

const assertKebabCaseTag = (tag: string): void => {
  if (!AGENT_ASSET_SLUG_PATTERN.test(tag)) {
    throw new BadRequestException(
      `Invalid tag "${tag}": tags must be kebab-case slugs (lowercase letters, digits, single hyphens; e.g. "pr-review").`,
    );
  }
};

@Injectable()
export class SkillTagsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(UserSkillTag)
    private readonly repository: Repository<UserSkillTag>,
  ) {
    this.logger.debug('🧩 skill-tags 🧩');
  }

  /**
   * @description Returns the TypeORM repository for user skill tags.
   */
  getRepository(): Repository<UserSkillTag> {
    return this.repository;
  }

  /**
   * @description Lists the user's skill-tag vocabulary, alphabetically by tag.
   * If the user has zero rows, seeds the platform-default vocabulary
   * (`DEFAULT_SKILL_TAG_VOCABULARY`) for that user, then returns it.
   */
  async listForUser(userId: string): Promise<UserSkillTag[]> {
    const existing = await this.repository.find({
      order: { tag: 'ASC' },
      where: { userId },
    });
    if (existing.length > 0) {
      return existing;
    }

    await this.seedDefaults(userId);
    return this.repository.find({
      order: { tag: 'ASC' },
      where: { userId },
    });
  }

  /**
   * @description Adds a tag to the user's vocabulary. Validates kebab-case and
   * rejects duplicates with actionable errors.
   */
  async addTag(userId: string, tag: string): Promise<UserSkillTag> {
    const normalized = normalizeTag(tag);
    assertKebabCaseTag(normalized);

    const entity = this.repository.create({ tag: normalized, userId });
    try {
      return await this.repository.save(entity);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Tag "${normalized}" is already in your skill-tag vocabulary.`,
        );
      }
      throw error;
    }
  }

  /**
   * @description Renames a tag in the user's vocabulary. Rejects when the source
   * tag is absent or the target tag already exists, with actionable errors.
   */
  async renameTag(
    userId: string,
    from: string,
    to: string,
  ): Promise<UserSkillTag> {
    const normalizedTo = normalizeTag(to);
    assertKebabCaseTag(normalizedTo);

    const existing = await this.repository.findOne({
      where: { tag: from, userId },
    });
    if (!existing) {
      throw new NotFoundException(
        `Tag "${from}" is not in your skill-tag vocabulary.`,
      );
    }

    if (normalizedTo === existing.tag) {
      return existing;
    }

    existing.tag = normalizedTo;
    try {
      return await this.repository.save(existing);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Tag "${normalizedTo}" is already in your skill-tag vocabulary.`,
        );
      }
      throw error;
    }
  }

  /**
   * @description Removes a tag from the user's vocabulary. Returns false when the
   * tag was not present.
   */
  async removeTag(userId: string, tag: string): Promise<boolean> {
    const result = await this.repository.delete({ tag, userId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Seeds the platform-default vocabulary for a user, idempotently
   * (ON CONFLICT DO NOTHING semantics), skipping any tags the user already has.
   */
  private async seedDefaults(userId: string): Promise<void> {
    const rows = DEFAULT_SKILL_TAG_VOCABULARY.map((tag) => ({ tag, userId }));
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(UserSkillTag)
      .values(rows)
      .orIgnore()
      .execute();
  }
}
