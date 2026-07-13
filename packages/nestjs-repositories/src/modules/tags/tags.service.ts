/**
 * @description CRUD + rollup for plan/task tags (plan_tags, task_tags).
 *
 * Every write takes a {@link TagCaller} resolved by the API layer from the
 * request principal; `source` is derived from it ({@link deriveTagSource}) and
 * never accepted from client input. Tags are validated against the caller's
 * user_skill_tags vocabulary (dimension is denormalized from the matching
 * vocabulary row). The provenance ladder `human > agent > server-llm`
 * arbitrates phase-tag replacement and removals. `getEffectiveTagSet` is the
 * rollup the rules engine and plan-aware availability reads consume.
 * See docs/monorepo/plan-task-tags-rules-design.md ("Tag model").
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
  DEFAULT_TAG_VOCABULARY_SEED,
} from '@openthrottle/openthrottle-skills';
import { QueryFailedError, Repository } from 'typeorm';
import { SkillTagsService } from '../skill-tags/skill-tags.service';
import { Task } from '../tasks/task.entity';
import { PlanTag } from './plan-tag.entity';
import { TaskTag } from './task-tag.entity';
import {
  deriveTagSource,
  TAG_SOURCE_RANK,
  type TagCaller,
  type TagSource,
} from './tag-provenance';

const PHASE_DIMENSION = 'phase';

/**
 * @description One entry of an effective tag set: deduped by tag name with the
 * highest-provenance source (and that row's confidence) winning for display.
 * @public
 */
export interface EffectiveTag {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly source: TagSource;
  readonly tag: string;
}

/** @public */
export interface AddTagOptions {
  /** Model confidence (0-1) — stored for server-llm writes, observability only. */
  readonly confidence?: number | null;
}

const isPostgresError = (error: unknown, code: string): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === code
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

const assertLadderAllowsRemoval = (
  callerSource: TagSource,
  row: { source: TagSource; tag: string },
): void => {
  if (TAG_SOURCE_RANK[callerSource] < TAG_SOURCE_RANK[row.source]) {
    throw new ConflictException(
      `Cannot remove tag "${row.tag}": it was set by "${row.source}", which outranks "${callerSource}" on the provenance ladder (human > agent > server-llm).`,
    );
  }
};

@Injectable()
export class TagsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(PlanTag)
    private readonly planTagsRepository: Repository<PlanTag>,
    @InjectRepository(TaskTag)
    private readonly taskTagsRepository: Repository<TaskTag>,
    private readonly skillTagsService: SkillTagsService,
  ) {
    this.logger.debug('🏷️ tags 🏷️');
  }

  /**
   * @description Returns the TypeORM repository for plan tags (loader factories).
   */
  getPlanTagsRepository(): Repository<PlanTag> {
    return this.planTagsRepository;
  }

  /**
   * @description Returns the TypeORM repository for task tags (loader factories).
   */
  getTaskTagsRepository(): Repository<TaskTag> {
    return this.taskTagsRepository;
  }

  /**
   * @description Attaches a tag to a plan as the caller's derived identity.
   * Validates the tag against the caller's vocabulary, enforces at most one
   * phase tag per plan (equal-or-lower provenance is replaced; higher-provenance
   * rows reject the write), and is idempotent for an already-present tag.
   */
  async addPlanTag(
    caller: TagCaller,
    planId: string,
    tag: string,
    options: AddTagOptions = {},
  ): Promise<PlanTag> {
    const normalized = normalizeTag(tag);
    assertKebabCaseTag(normalized);

    const dimension = await this.resolveDimension(caller, normalized);
    const source = deriveTagSource(caller);
    const confidence = options.confidence ?? null;

    if (dimension === PHASE_DIMENSION) {
      await this.displaceExistingPhaseTag(planId, normalized, source);
    }

    const findExisting = async (): Promise<PlanTag | null> =>
      this.planTagsRepository.findOne({ where: { planId, tag: normalized } });

    const existing = await findExisting();
    if (existing != null) {
      if (TAG_SOURCE_RANK[source] > TAG_SOURCE_RANK[existing.source]) {
        existing.source = source;
        existing.confidence = confidence;
        return this.planTagsRepository.save(existing);
      }
      return existing;
    }

    const entity = this.planTagsRepository.create({
      confidence,
      dimension,
      planId,
      source,
      tag: normalized,
    });
    try {
      return await this.planTagsRepository.save(entity);
    } catch (error) {
      if (isPostgresError(error, '23503')) {
        throw new NotFoundException(`Plan "${planId}" not found.`);
      }
      if (isPostgresError(error, '23505')) {
        const winner = await findExisting();
        if (winner != null) return winner;
      }
      throw error;
    }
  }

  /**
   * @description Attaches a tag to a task as the caller's derived identity.
   * Same vocabulary/dimension validation as plans; the ≤1-phase constraint is
   * plan-level and does not apply per task.
   */
  async addTaskTag(
    caller: TagCaller,
    taskId: string,
    tag: string,
    options: AddTagOptions = {},
  ): Promise<TaskTag> {
    const normalized = normalizeTag(tag);
    assertKebabCaseTag(normalized);

    const dimension = await this.resolveDimension(caller, normalized);
    const source = deriveTagSource(caller);
    const confidence = options.confidence ?? null;

    const findExisting = async (): Promise<TaskTag | null> =>
      this.taskTagsRepository.findOne({ where: { tag: normalized, taskId } });

    const existing = await findExisting();
    if (existing != null) {
      if (TAG_SOURCE_RANK[source] > TAG_SOURCE_RANK[existing.source]) {
        existing.source = source;
        existing.confidence = confidence;
        return this.taskTagsRepository.save(existing);
      }
      return existing;
    }

    const entity = this.taskTagsRepository.create({
      confidence,
      dimension,
      source,
      tag: normalized,
      taskId,
    });
    try {
      return await this.taskTagsRepository.save(entity);
    } catch (error) {
      if (isPostgresError(error, '23503')) {
        throw new NotFoundException(`Task "${taskId}" not found.`);
      }
      if (isPostgresError(error, '23505')) {
        const winner = await findExisting();
        if (winner != null) return winner;
      }
      throw error;
    }
  }

  /**
   * @description Removes a tag from a plan under the ladder: the caller's rank
   * must be at least the row's rank (an agent cannot remove a human row;
   * server-llm removes only its own rows). Returns false when absent.
   */
  async removePlanTag(
    caller: TagCaller,
    planId: string,
    tag: string,
  ): Promise<boolean> {
    const row = await this.planTagsRepository.findOne({
      where: { planId, tag: normalizeTag(tag) },
    });
    if (row == null) {
      return false;
    }

    assertLadderAllowsRemoval(deriveTagSource(caller), row);
    await this.planTagsRepository.delete({ id: row.id });
    return true;
  }

  /**
   * @description Removes a tag from a task under the same ladder as plans.
   * Returns false when absent.
   */
  async removeTaskTag(
    caller: TagCaller,
    taskId: string,
    tag: string,
  ): Promise<boolean> {
    const row = await this.taskTagsRepository.findOne({
      where: { tag: normalizeTag(tag), taskId },
    });
    if (row == null) {
      return false;
    }

    assertLadderAllowsRemoval(deriveTagSource(caller), row);
    await this.taskTagsRepository.delete({ id: row.id });
    return true;
  }

  /**
   * @description Assembles the effective tag set. Plan context (no taskId):
   * plan tags ∪ every task's tags. Task context: that task's tags ∪ the plan's
   * tags. Deduped by tag name; the highest-provenance row wins for display.
   */
  async getEffectiveTagSet(
    planId: string,
    taskId?: string,
  ): Promise<EffectiveTag[]> {
    const planTags = await this.planTagsRepository.find({ where: { planId } });

    const taskTagsQuery = this.taskTagsRepository
      .createQueryBuilder('taskTag')
      .innerJoin(Task, 'task', 'task.id = taskTag.task_id')
      .where('task.plan_id = :planId', { planId });
    if (taskId != null) {
      taskTagsQuery.andWhere('taskTag.task_id = :taskId', { taskId });
    }
    const taskTags = await taskTagsQuery.getMany();

    // Task rows first so an equal-rank plan row overwrites them: the plan row
    // is the broader statement of the same tag.
    const byTag = new Map<string, EffectiveTag>();
    for (const row of [...taskTags, ...planTags]) {
      const existing = byTag.get(row.tag);
      if (
        existing != null &&
        TAG_SOURCE_RANK[existing.source] > TAG_SOURCE_RANK[row.source]
      ) {
        continue;
      }
      byTag.set(row.tag, {
        confidence: row.confidence,
        dimension: row.dimension,
        source: row.source,
        tag: row.tag,
      });
    }

    return [...byTag.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }

  /**
   * @description Resolves the tag's dimension from the caller's vocabulary.
   * User callers get seed-on-first-read semantics; service accounts read their
   * own rows and fall back to the committed platform default while they have
   * none (the tagging-jobs slice bootstraps the tagging account's rows).
   */
  private async resolveDimension(
    caller: TagCaller,
    tag: string,
  ): Promise<string> {
    const rows =
      caller.principalKind === 'user'
        ? await this.skillTagsService.listForUser(caller.subjectId)
        : await this.skillTagsService
            .getRepository()
            .find({ where: { userId: caller.subjectId } });

    const entries: readonly { dimension: string; tag: string }[] =
      rows.length > 0 ? rows : DEFAULT_TAG_VOCABULARY_SEED;
    const vocabulary = new Map<string, string>(
      entries.map((entry) => [entry.tag, entry.dimension]),
    );

    const dimension = vocabulary.get(tag);
    if (dimension == null) {
      throw new BadRequestException(
        `Unknown tag "${tag}": not in the caller's skill-tag vocabulary. Add it to the vocabulary first (add_skill_tag / addSkillTag).`,
      );
    }
    return dimension;
  }

  /**
   * @description Enforces ≤1 phase tag per plan: an existing different phase
   * row is deleted when the caller's rank is at least the row's rank, and
   * rejected with a ladder explanation otherwise.
   */
  private async displaceExistingPhaseTag(
    planId: string,
    tag: string,
    source: TagSource,
  ): Promise<void> {
    const existingPhase = await this.planTagsRepository.findOne({
      where: { dimension: PHASE_DIMENSION, planId },
    });
    if (existingPhase == null || existingPhase.tag === tag) {
      return;
    }

    if (TAG_SOURCE_RANK[source] < TAG_SOURCE_RANK[existingPhase.source]) {
      throw new ConflictException(
        `Cannot replace phase tag "${existingPhase.tag}" on plan ${planId}: it was set by "${existingPhase.source}", which outranks "${source}" on the provenance ladder (human > agent > server-llm). At most one phase tag per plan.`,
      );
    }

    await this.planTagsRepository.delete({ id: existingPhase.id });
  }
}
