/**
 * @description Per-project skill registry (project_skills). Written by the agent-asset
 * ingest path and read by the (later) skill-availability resolver surface.
 *
 * `getSkillsForProject` returns the per-project skill universe with its static
 * frontmatter `tags` and tri-state `disableModelInvocation` flag, WITHOUT disk
 * access — the DB is the single source. `reconcileProjectSkills` is the ingest
 * write interface: it upserts on (project_id, slug) and deletes rows for skills
 * that have vanished from the source, so a re-run converges the project's rows
 * to exactly the ingested set. See docs/monorepo/skill-availability-design.md
 * ("Topology" + "Output contract").
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ProjectSkillInput,
  SkillSource,
} from '@openthrottle/openthrottle-skills';
import { In, Repository } from 'typeorm';
import { ProjectSkill } from './project-skill.entity';

/**
 * A skill as exposed to the availability resolver: slug, static frontmatter
 * tags, and the tri-state static flag (`undefined` when the frontmatter omits
 * `disable-model-invocation`, preserved distinct from an explicit `false`).
 */
export interface ProjectSkillView {
  /** Frontmatter description; `undefined` when the ingested row has none. */
  readonly description: string | undefined;
  readonly slug: string;
  readonly source: SkillSource;
  readonly sourceUrl: string | undefined;
  readonly staticDisableModelInvocation: boolean | undefined;
  readonly tags: readonly string[];
}

/** Outcome of a reconcile: how many rows were upserted and how many stale rows deleted. */
export interface ProjectSkillReconciliation {
  readonly deleted: number;
  readonly upserted: number;
}

@Injectable()
export class ProjectSkillsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(ProjectSkill)
    private readonly repository: Repository<ProjectSkill>,
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

    return rows.map((row) => ({
      description: row.description ?? undefined,
      slug: row.slug,
      // The CHECK constraint pins the column to the SkillSource values; the
      // ternary narrows string → SkillSource without a cast.
      source: row.source === 'openthrottle' ? 'openthrottle' : 'external',
      sourceUrl: row.sourceUrl ?? undefined,
      staticDisableModelInvocation: row.disableModelInvocation ?? undefined,
      tags: row.tags,
    }));
  }

  /**
   * @description Refreshes a project's skill rows from an ingested set: upserts
   * each input on (project_id, slug) and deletes rows whose slug is absent from
   * the input, so re-running converges to exactly the ingested skills. Idempotent.
   */
  async reconcileProjectSkills(
    projectId: string,
    inputs: readonly ProjectSkillInput[],
  ): Promise<ProjectSkillReconciliation> {
    const ingestedAt = new Date();
    const rows = inputs.map((input) => ({
      description: input.description ?? null,
      disableModelInvocation: input.disableModelInvocation ?? null,
      ingestedAt,
      projectId,
      slug: input.slug,
      source: input.source,
      sourcePath: input.sourcePath,
      sourceUrl: input.sourceUrl ?? null,
      tags: [...input.tags],
    }));

    if (rows.length > 0) {
      await this.repository.upsert(rows, {
        conflictPaths: ['projectId', 'slug'],
      });
    }

    const keepSlugs = new Set(inputs.map((input) => input.slug));
    const existing = await this.repository.find({ where: { projectId } });
    const staleSlugs = existing
      .map((row) => row.slug)
      .filter((slug) => !keepSlugs.has(slug));

    let deleted = 0;
    if (staleSlugs.length > 0) {
      const result = await this.repository.delete({
        projectId,
        slug: In(staleSlugs),
      });
      deleted = result.affected ?? 0;
    }

    return { deleted, upserted: rows.length };
  }
}
