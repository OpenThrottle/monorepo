/**
 * @description CRUD + rollup for plan/task/project tags (plan_tags, task_tags, project_tags).
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
import { LoggerService } from '@openthrottle/nestjs-modules';
import { isUniqueViolation } from '@openthrottle/nestjs-postgres';
import type {
  PlanTag,
  ProjectTag,
  TagSource,
  TaskTag,
} from '@openthrottle/nestjs-repositories-server';
import {
  PlanTagsRepository,
  ProjectTagsRepository,
  SkillTagsRepository,
  TAG_SOURCE_RANK,
  TaskTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  AGENT_ASSET_SLUG_PATTERN,
  DEFAULT_TAG_VOCABULARY_SEED,
  SYSTEM_TAG_VOCABULARY,
} from '@openthrottle/openthrottle-skills';

import type { AddTagOptions, EffectiveTag, TagCaller } from './tags.types.ts';
import { deriveTagSource, isForeignKeyViolation } from './tags.utils.ts';

const PHASE_DIMENSION = 'phase';

const normalizeTag = (tag: string): string => {
  return tag.trim();
};

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
    private readonly planTagsRepository: PlanTagsRepository,
    private readonly projectTagsRepository: ProjectTagsRepository,
    private readonly skillTagsRepository: SkillTagsRepository,
    private readonly taskTagsRepository: TaskTagsRepository,
  ) {
    this.logger.debug('🏷️ tags 🏷️');
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

    const findExisting = async (): Promise<PlanTag | null> => {
      return this.planTagsRepository.findByPlanAndTag(planId, normalized);
    };

    const existing = await findExisting();
    if (existing != null) {
      if (TAG_SOURCE_RANK[source] > TAG_SOURCE_RANK[existing.source]) {
        return this.planTagsRepository.update(existing.id, {
          confidence,
          source,
        });
      }
      return existing;
    }

    try {
      return await this.planTagsRepository.create({
        confidence,
        dimension,
        planId,
        source,
        tag: normalized,
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException(`Plan "${planId}" not found.`);
      }
      if (isUniqueViolation(error)) {
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

    const findExisting = async (): Promise<TaskTag | null> => {
      return this.taskTagsRepository.findByTaskAndTag(taskId, normalized);
    };

    const existing = await findExisting();
    if (existing != null) {
      if (TAG_SOURCE_RANK[source] > TAG_SOURCE_RANK[existing.source]) {
        return this.taskTagsRepository.update(existing.id, {
          confidence,
          source,
        });
      }
      return existing;
    }

    try {
      return await this.taskTagsRepository.create({
        confidence,
        dimension,
        source,
        tag: normalized,
        taskId,
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException(`Task "${taskId}" not found.`);
      }
      if (isUniqueViolation(error)) {
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
    const row = await this.planTagsRepository.findByPlanAndTag(
      planId,
      normalizeTag(tag),
    );
    if (row == null) {
      return false;
    }

    assertLadderAllowsRemoval(deriveTagSource(caller), row);
    await this.planTagsRepository.remove(row.id);
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
    const row = await this.taskTagsRepository.findByTaskAndTag(
      taskId,
      normalizeTag(tag),
    );
    if (row == null) {
      return false;
    }

    assertLadderAllowsRemoval(deriveTagSource(caller), row);
    await this.taskTagsRepository.remove(row.id);
    return true;
  }

  /**
   * @description Attaches a tag to a project as the caller's derived identity.
   * Same vocabulary/dimension validation and provenance ladder as tasks; the
   * ≤1-phase constraint is plan-level and does not apply per project (multiple
   * tags allowed).
   */
  async addProjectTag(
    caller: TagCaller,
    projectId: string,
    tag: string,
    options: AddTagOptions = {},
  ): Promise<ProjectTag> {
    const normalized = normalizeTag(tag);
    assertKebabCaseTag(normalized);

    const dimension = await this.resolveDimension(caller, normalized);
    const source = deriveTagSource(caller);
    const confidence = options.confidence ?? null;

    const findExisting = async (): Promise<ProjectTag | null> => {
      return this.projectTagsRepository.findByProjectAndTag(
        projectId,
        normalized,
      );
    };

    const existing = await findExisting();
    if (existing != null) {
      if (TAG_SOURCE_RANK[source] > TAG_SOURCE_RANK[existing.source]) {
        return this.projectTagsRepository.update(existing.id, {
          confidence,
          source,
        });
      }
      return existing;
    }

    try {
      return await this.projectTagsRepository.create({
        confidence,
        dimension,
        projectId,
        source,
        tag: normalized,
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException(`Project "${projectId}" not found.`);
      }
      if (isUniqueViolation(error)) {
        const winner = await findExisting();
        if (winner != null) return winner;
      }
      throw error;
    }
  }

  /**
   * @description Removes a tag from a project under the same ladder as tasks.
   * Returns false when absent.
   */
  async removeProjectTag(
    caller: TagCaller,
    projectId: string,
    tag: string,
  ): Promise<boolean> {
    const row = await this.projectTagsRepository.findByProjectAndTag(
      projectId,
      normalizeTag(tag),
    );
    if (row == null) {
      return false;
    }

    assertLadderAllowsRemoval(deriveTagSource(caller), row);
    await this.projectTagsRepository.remove(row.id);
    return true;
  }

  /**
   * @description Assembles the effective tag set. Plan context (no taskId):
   * plan tags ∪ every task's tags ∪ the plan's project's tags. Task context:
   * that task's tags ∪ the plan's tags ∪ the plan's project's tags. Deduped by
   * tag name; the highest-provenance row wins for display (broader scope wins
   * equal-rank ties: task < plan < project).
   */
  async getEffectiveTagSet(
    planId: string,
    taskId?: string,
  ): Promise<EffectiveTag[]> {
    const planTags = await this.planTagsRepository.listByPlanId(planId);
    const taskTags = await this.taskTagsRepository.listForPlan(planId, taskId);
    // Project tags for the plan's project (empty when the plan has no project).
    const projectTags =
      await this.projectTagsRepository.listForPlanProject(planId);

    // Ordered least-specific → most-specific (task, plan, project) so an
    // equal-rank broader row overwrites a narrower one: the broader row is the
    // broader statement of the same tag.
    const byTag = new Map<string, EffectiveTag>();
    for (const row of [...taskTags, ...planTags, ...projectTags]) {
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
   * @description The effective tag NAMES of many plans in one query (see
   * `getEffectiveTagSet` for the per-plan union: plan ∪ live tasks ∪ project). Provenance is not
   * needed by callers that only match on tag presence, e.g. the rule preview. Every requested
   * plan has a key; a plan with no tags maps to an empty list.
   */
  async getEffectiveTagNamesForPlans(
    planIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const rows =
      await this.planTagsRepository.listEffectiveTagNamesForPlans(planIds);
    const byPlan = new Map<string, string[]>(
      planIds.map((planId) => [planId, []]),
    );
    for (const row of rows) {
      byPlan.get(row.planId)?.push(row.tag);
    }
    for (const tags of byPlan.values()) {
      tags.sort((a, b) => a.localeCompare(b));
    }
    return byPlan;
  }

  /**
   * @description Resolves the tag's dimension from the caller's vocabulary.
   * User callers get seed-on-first-read semantics; service accounts read their
   * own rows and fall back to the committed platform default while they have
   * none (the tagging-jobs slice bootstraps the tagging account's rows).
   * Platform system tags (`SYSTEM_TAG_VOCABULARY`) resolve for every caller
   * without a vocabulary lookup.
   */
  private async resolveDimension(
    caller: TagCaller,
    tag: string,
  ): Promise<string> {
    const systemTag = SYSTEM_TAG_VOCABULARY.find((entry) => entry.tag === tag);
    if (systemTag != null) {
      return systemTag.dimension;
    }

    const rows = await this.listVocabularyRows(caller);

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

  private listVocabularyRows(caller: TagCaller) {
    if (caller.principalKind === 'user') {
      return this.skillTagsRepository.listForUser(caller.subjectId);
    }
    return this.skillTagsRepository.findBy({
      where: { userId: caller.subjectId },
    });
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
    const existingPhase = await this.planTagsRepository.findByPlanAndDimension(
      planId,
      PHASE_DIMENSION,
    );
    if (existingPhase == null || existingPhase.tag === tag) {
      return;
    }

    if (TAG_SOURCE_RANK[source] < TAG_SOURCE_RANK[existingPhase.source]) {
      throw new ConflictException(
        `Cannot replace phase tag "${existingPhase.tag}" on plan ${planId}: it was set by "${existingPhase.source}", which outranks "${source}" on the provenance ladder (human > agent > server-llm). At most one phase tag per plan.`,
      );
    }

    await this.planTagsRepository.remove(existingPhase.id);
  }
}
