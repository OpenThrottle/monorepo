/**
 * @description Per-project skill registry (project_skills). Written by the agent-asset
 * ingest path and read by the (later) skill-availability resolver surface.
 *
 * `getSkillsForProject` returns the per-project skill universe with its stored
 * `tags` and tri-state `disableModelInvocation` flag, WITHOUT disk access — the
 * DB is the single source. `reconcileProjectSkills` is the ingest write
 * interface: it upserts on (project_id, slug) without clobbering `tags`, and
 * marks vanished slugs as orphans instead of deleting them. See
 * docs/monorepo/skill-availability-design.md ("Topology" + "Output contract").
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ProjectSkillInput,
  SkillSource,
} from '@openthrottle/openthrottle-skills';
import {
  AGENT_ASSET_SLUG_PATTERN,
  DEFAULT_TAG_VOCABULARY_SEED,
} from '@openthrottle/openthrottle-skills';
import { Repository } from 'typeorm';
import { SkillTagsService } from '../skill-tags/skill-tags.service';
import type { TagCaller } from '../tags/tag-provenance';
import { ProjectSkill } from './project-skill.entity';

/**
 * A skill as exposed to the availability resolver: slug, static frontmatter
 * tags, and the tri-state static flag (`undefined` when the frontmatter omits
 * `disable-model-invocation`, preserved distinct from an explicit `false`).
 */
export interface ProjectSkillView {
  /** Frontmatter description; `undefined` when the ingested row has none. */
  readonly description: string | undefined;
  /** Set when ingest last found the slug missing from disk. */
  readonly orphanedAt: Date | undefined;
  readonly slug: string;
  readonly source: SkillSource;
  readonly sourceUrl: string | undefined;
  readonly staticDisableModelInvocation: boolean | undefined;
  readonly tags: readonly string[];
}

/** Outcome of a reconcile: upsert count plus slugs still in the DB but absent from disk. */
export interface ProjectSkillReconciliation {
  readonly staleSlugs: readonly string[];
  readonly upserted: number;
}

const PHASE_DIMENSION = 'phase';

const toView = (row: ProjectSkill): ProjectSkillView => ({
  description: row.description ?? undefined,
  orphanedAt: row.orphanedAt ?? undefined,
  slug: row.slug,
  source: row.source === 'openthrottle' ? 'openthrottle' : 'external',
  sourceUrl: row.sourceUrl ?? undefined,
  staticDisableModelInvocation: row.disableModelInvocation ?? undefined,
  tags: row.tags,
});

const normalizeTag = (tag: string): string => tag.trim();

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
    @InjectRepository(ProjectSkill)
    private readonly repository: Repository<ProjectSkill>,
    private readonly skillTagsService: SkillTagsService,
  ) {
    this.logger.debug('🧩 project-skills 🧩');
  }

  /**
   * @description Returns the TypeORM repository for project skills.
   */
  getRepository(): Repository<ProjectSkill> {
    return this.repository;
  }

  /**
   * @description Returns the project's skill universe (alphabetical by slug) with
   * static tags and the tri-state static flag. A NULL `disable_model_invocation`
   * column normalizes to `undefined`, preserving the frontmatter tri-state.
   */
  async getSkillsForProject(projectId: string): Promise<ProjectSkillView[]> {
    const rows = await this.repository.find({
      order: { slug: 'ASC' },
      where: { projectId },
    });

    return rows.map(toView);
  }

  /**
   * @description Refreshes a project's skill rows from an ingested set: inserts
   * new slugs with empty tags, updates existing slugs' metadata without touching
   * `tags`, and marks rows whose slug is absent from the input as orphans
   * (`orphanedAt`) instead of deleting them. Idempotent.
   */
  async reconcileProjectSkills(
    projectId: string,
    inputs: readonly ProjectSkillInput[],
  ): Promise<ProjectSkillReconciliation> {
    const ingestedAt = new Date();
    const existing = await this.repository.find({ where: { projectId } });
    const existingSlugs = new Set(existing.map((row) => row.slug));

    const metadata = (
      input: ProjectSkillInput,
    ): {
      readonly description: string | null;
      readonly disableModelInvocation: boolean | null;
      readonly ingestedAt: Date;
      readonly orphanedAt: null;
      readonly source: SkillSource;
      readonly sourcePath: string;
      readonly sourceUrl: string | null;
    } => ({
      description: input.description ?? null,
      disableModelInvocation: input.disableModelInvocation ?? null,
      ingestedAt,
      orphanedAt: null,
      source: input.source,
      sourcePath: input.sourcePath,
      sourceUrl: input.sourceUrl ?? null,
    });

    const inserts = inputs
      .filter((input) => !existingSlugs.has(input.slug))
      .map((input) => ({
        ...metadata(input),
        projectId,
        slug: input.slug,
        tags: [],
      }));

    const updates = inputs.filter((input) => existingSlugs.has(input.slug));

    if (inserts.length > 0) {
      await this.repository.insert(inserts);
    }

    await Promise.all(
      updates.map((input) =>
        this.repository.update(
          { projectId, slug: input.slug },
          metadata(input),
        ),
      ),
    );

    const keepSlugs = new Set(inputs.map((input) => input.slug));
    const staleSlugs = existing
      .map((row) => row.slug)
      .filter((slug) => !keepSlugs.has(slug))
      .sort((left, right) => left.localeCompare(right));

    if (staleSlugs.length > 0) {
      await Promise.all(
        staleSlugs.map((slug) => {
          const row = existing.find((candidate) => candidate.slug === slug);
          if (row?.orphanedAt != null) {
            return Promise.resolve();
          }
          return this.repository.update(
            { projectId, slug },
            { orphanedAt: ingestedAt },
          );
        }),
      );
    }

    return { staleSlugs, upserted: inputs.length };
  }

  /**
   * @description Deletes one project_skills row by (projectId, slug). Returns
   * true when a row was removed. Distinct from ingest reconcile — orphans stay
   * until this explicit remove.
   */
  async removeProjectSkill(projectId: string, slug: string): Promise<boolean> {
    const result = await this.repository.delete({ projectId, slug });
    return (result.affected ?? 0) > 0;
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
    await this.repository.update({ id: row.id }, { tags });
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
    const row = await this.repository.findOne({
      where: { projectId, slug },
    });
    if (row == null) {
      return false;
    }

    const normalized = normalizeTag(tag);
    if (!row.tags.includes(normalized)) {
      return false;
    }

    const tags = row.tags.filter((existing) => existing !== normalized);
    await this.repository.update({ id: row.id }, { tags });
    return true;
  }

  private async findRowOrThrow(
    projectId: string,
    slug: string,
  ): Promise<ProjectSkill> {
    const row = await this.repository.findOne({
      where: { projectId, slug },
    });
    if (row == null) {
      throw new NotFoundException(
        `Project skill "${slug}" not found for project ${projectId}.`,
      );
    }
    return row;
  }

  private async assertDomainTag(caller: TagCaller, tag: string): Promise<void> {
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
    if (dimension === PHASE_DIMENSION) {
      throw new BadRequestException(
        `Phase tag "${tag}" cannot attach to a skill. Skills only carry domain tags.`,
      );
    }
  }
}
