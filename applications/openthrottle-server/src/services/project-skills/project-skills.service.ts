/**
 * @description Per-project skill registry reads and record-level tag writes over project_skills.
 * The ingest write path is `ProjectSkillsRepository.reconcile`.
 *
 * `getSkillsForProject` returns the per-project skill universe with its stored
 * `tags` and tri-state `disableModelInvocation` flag, WITHOUT disk access — the
 * DB is the single source. See docs/monorepo/skill-availability-design.md
 * ("Topology" + "Output contract").
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { ProjectSkill } from '@openthrottle/nestjs-repositories-server';
import {
  ProjectSkillsRepository,
  SkillTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  AGENT_ASSET_SLUG_PATTERN,
  DEFAULT_TAG_VOCABULARY_SEED,
} from '@openthrottle/openthrottle-skills';

import type { TagCaller } from '../tags/tags.types.ts';
import type { ProjectSkillView } from './project-skills.types.ts';

const PHASE_DIMENSION = 'phase';

const toView = (row: ProjectSkill): ProjectSkillView => {
  return {
    description: row.description ?? undefined,
    orphanedAt: row.orphanedAt ?? undefined,
    slug: row.slug,
    source: row.source === 'openthrottle' ? 'openthrottle' : 'external',
    sourceUrl: row.sourceUrl ?? undefined,
    staticDisableModelInvocation: row.disableModelInvocation ?? undefined,
    tags: row.tags,
  };
};

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

@Injectable()
export class ProjectSkillsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly projectSkillsRepository: ProjectSkillsRepository,
    private readonly skillTagsRepository: SkillTagsRepository,
  ) {
    this.logger.debug('🧩 project-skills 🧩');
  }

  /**
   * @description Returns the project's skill universe (alphabetical by slug) with
   * static tags and the tri-state static flag. A NULL `disable_model_invocation`
   * column normalizes to `undefined`, preserving the frontmatter tri-state.
   */
  async getSkillsForProject(projectId: string): Promise<ProjectSkillView[]> {
    const rows = await this.projectSkillsRepository.listForProject(projectId);

    return rows.map(toView);
  }

  /**
   * @description Soft deletes one project_skills row by (projectId, slug). Returns
   * true when a row was removed. Distinct from ingest reconcile — orphans stay
   * until this explicit remove, and a later ingest of the slug inserts a fresh row.
   */
  async removeProjectSkill(projectId: string, slug: string): Promise<boolean> {
    return this.projectSkillsRepository.removeBySlug(projectId, slug);
  }

  /**
   * @description Attaches a domain tag to a project_skills row. Validates the
   * tag against the caller's vocabulary, rejects phase tags, and is idempotent
   * when the tag is already present.
   */
  async addProjectSkillTag(
    caller: TagCaller,
    projectId: string,
    slug: string,
    tag: string,
  ): Promise<ProjectSkillView> {
    const normalized = normalizeTag(tag);
    assertKebabCaseTag(normalized);
    await this.assertDomainTag(caller, normalized);

    const row = await this.findRowOrThrow(projectId, slug);
    if (row.tags.includes(normalized)) {
      return toView(row);
    }

    const tags = [...row.tags, normalized].sort((left, right) =>
      left.localeCompare(right),
    );
    await this.projectSkillsRepository.update(row.id, { tags });
    return toView({ ...row, tags });
  }

  /**
   * @description Removes a tag from a project_skills row. Returns false when
   * the row or tag is absent (never a 500).
   */
  async removeProjectSkillTag(
    projectId: string,
    slug: string,
    tag: string,
  ): Promise<boolean> {
    const row = await this.projectSkillsRepository.findByProjectAndSlug(
      projectId,
      slug,
    );
    if (row == null) {
      return false;
    }

    const normalized = normalizeTag(tag);
    if (!row.tags.includes(normalized)) {
      return false;
    }

    const tags = row.tags.filter((existing) => existing !== normalized);
    await this.projectSkillsRepository.update(row.id, { tags });
    return true;
  }

  private async findRowOrThrow(
    projectId: string,
    slug: string,
  ): Promise<ProjectSkill> {
    const row = await this.projectSkillsRepository.findByProjectAndSlug(
      projectId,
      slug,
    );
    if (row == null) {
      throw new NotFoundException(
        `Project skill "${slug}" not found for project ${projectId}.`,
      );
    }
    return row;
  }

  private async listVocabularyRows(caller: TagCaller) {
    if (caller.principalKind === 'user') {
      return this.skillTagsRepository.listForUser(caller.subjectId);
    }
    return this.skillTagsRepository.findBy({
      where: { userId: caller.subjectId },
    });
  }

  private async assertDomainTag(caller: TagCaller, tag: string): Promise<void> {
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
    if (dimension === PHASE_DIMENSION) {
      throw new BadRequestException(
        `Phase tag "${tag}" cannot attach to a skill. Skills only carry domain tags.`,
      );
    }
  }
}
