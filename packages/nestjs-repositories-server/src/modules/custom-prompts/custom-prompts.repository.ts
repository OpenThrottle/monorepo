import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { IsNull, Not, Repository } from 'typeorm';

import { CustomPrompt } from './custom-prompt.entity.ts';
import type {
  CustomPromptType,
  ListCustomPromptsFilter,
} from './custom-prompts.types.ts';

/**
 * @description Data access for the openthrottle `custom_prompts` table on the default
 * connection: the `BaseRepository` CRUD (soft deletes) plus the filtered list, restore and
 * permanent delete the prompts surface needs. The agent-asset ingest writes this table with
 * raw SQL, filters `deleted_at IS NULL` itself, and revives a soft-deleted prompt by clearing
 * `deleted_at` on conflict, so a restored or revived row never collides with a live one.
 * @public
 */
@Injectable()
export class CustomPromptsRepository extends BaseRepository<
  CustomPrompt,
  CreateModelInput<CustomPrompt>
> {
  protected readonly tableName = 'custom_prompts';

  constructor(
    @InjectRepository(CustomPrompt)
    repository: Repository<CustomPrompt>,
  ) {
    super(repository);
  }

  /**
   * @description Lists prompts matching `filter`, newest first. Live rows only unless
   * `filter.includeDeleted`.
   */
  async listFiltered(filter: ListCustomPromptsFilter): Promise<CustomPrompt[]> {
    const query = this.repository.createQueryBuilder('cp');

    if (filter.includeDeleted) {
      query.withDeleted();
    } else {
      query.andWhere('cp.deleted_at IS NULL');
    }

    if (filter.promptType != null) {
      query.andWhere('cp.prompt_type = :promptType', {
        promptType: filter.promptType,
      });
    }

    if (filter.labels != null && filter.labels.length > 0) {
      query.andWhere('cp.labels ?| :labels', { labels: filter.labels });
    }

    if (filter.search != null && filter.search !== '') {
      query.andWhere('cp.title ILIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    if (filter.projectId != null) {
      query.andWhere('cp.project_id = :projectId', {
        projectId: filter.projectId,
      });
    }

    if (filter.userId != null) {
      query.andWhere('cp.user_id = :userId', { userId: filter.userId });
    }

    if (filter.viewerUserId === null) {
      query.andWhere('cp.user_id IS NULL');
    } else if (filter.viewerUserId !== undefined) {
      query.andWhere('(cp.user_id = :viewerUserId OR cp.user_id IS NULL)', {
        viewerUserId: filter.viewerUserId,
      });
    }

    query.orderBy('cp.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * @description Finds a prompt by id whether or not it is soft deleted, or null.
   */
  async findIncludingDeleted(id: string): Promise<CustomPrompt | null> {
    return this.findOne({ where: { id }, withDeleted: true });
  }

  /**
   * @description A live prompt by id that `ownerUserId` may see: owned by that user, or a
   * system row (`user_id IS NULL`). A null `ownerUserId` (a caller with no user identity)
   * sees system rows only. Null when the id is missing, soft deleted, or owned by someone
   * else (the caller cannot tell which).
   */
  async findVisibleById(
    id: string,
    ownerUserId: string | null,
  ): Promise<CustomPrompt | null> {
    const prompt = await this.findOne({ where: { id } });
    if (prompt == null) {
      return null;
    }
    const isVisible = prompt.userId == null || prompt.userId === ownerUserId;
    return isVisible ? prompt : null;
  }

  /**
   * @description The live prompt for `(filePath, promptType)` that `ownerUserId` may see. When
   * both a user-owned and a system row match, the user-owned one wins. A null `ownerUserId`
   * sees system rows only. Null when none is visible.
   */
  async findVisibleByFilePath(
    filePath: string,
    promptType: CustomPromptType,
    ownerUserId: string | null,
  ): Promise<CustomPrompt | null> {
    const systemWhere = { filePath, promptType, userId: IsNull() };
    const ownerWhere = {
      filePath,
      promptType,
      userId: ownerUserId ?? IsNull(),
    };
    const where =
      ownerUserId == null ? [systemWhere] : [ownerWhere, systemWhere];
    const candidates = await this.findBy({ where });
    return (
      candidates.find((prompt) => prompt.userId === ownerUserId) ??
      candidates[0] ??
      null
    );
  }

  /**
   * @description Soft deletes one live prompt. Returns false when no live prompt has that id.
   */
  async softDeleteById(id: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ id });
    return removedCount > 0;
  }

  /**
   * @description Clears `deleted_at` on a soft-deleted prompt and returns it. Null when the
   * prompt does not exist or is not deleted.
   */
  async restoreById(id: string): Promise<CustomPrompt | null> {
    const result = await this.repository.restore({
      deletedAt: Not(IsNull()),
      id,
    });

    if (!result.affected) {
      return null;
    }

    return this.findOne({ where: { id } });
  }

  /**
   * @description Permanently deletes a prompt, deleted or not, with its embeddings (they
   * cascade). Returns false when no row has that id. This is the one hard delete on the table.
   */
  async hardDeleteById(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
