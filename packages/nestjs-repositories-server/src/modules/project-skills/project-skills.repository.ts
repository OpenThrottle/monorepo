import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { ProjectSkillInput } from '@openthrottle/openthrottle-skills';
import { Repository } from 'typeorm';

import { ProjectSkill } from './project-skill.entity.ts';
import type { ProjectSkillReconciliation } from './project-skills.types.ts';

/**
 * @description Data access for the openthrottle `project_skills` table on the default connection:
 * the `BaseRepository` CRUD (soft deletes) plus the ingest reconcile. Only live rows take part
 * in reads and in the reconcile, so a soft-deleted skill is re-inserted as a new row when ingest
 * sees its slug again. Written by the agent-asset ingest and read by the skill-availability
 * resolver surface. See docs/monorepo/skill-availability-design.md ("Topology" + "Output
 * contract").
 * @public
 */
@Injectable()
export class ProjectSkillsRepository extends BaseRepository<
  ProjectSkill,
  CreateModelInput<ProjectSkill>
> {
  protected readonly tableName = 'project_skills';

  constructor(
    @InjectRepository(ProjectSkill)
    repository: Repository<ProjectSkill>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a project's live skills alphabetically by slug.
   */
  async listForProject(projectId: string): Promise<ProjectSkill[]> {
    return this.findBy({ order: { slug: 'ASC' }, where: { projectId } });
  }

  /**
   * @description Finds a project's live skill by slug, or null.
   */
  async findByProjectAndSlug(
    projectId: string,
    slug: string,
  ): Promise<ProjectSkill | null> {
    return this.findOne({ where: { projectId, slug } });
  }

  /**
   * @description Refreshes a project's live skill rows from an ingested set: inserts new slugs
   * with empty tags, updates existing slugs' metadata without touching `tags`, and marks live
   * rows whose slug is absent from the input as orphans (`orphanedAt`) instead of removing them.
   * Idempotent.
   */
  async reconcile(
    projectId: string,
    inputs: readonly ProjectSkillInput[],
  ): Promise<ProjectSkillReconciliation> {
    const ingestedAt = new Date();
    const existing = await this.findBy({ where: { projectId } });
    const existingSlugs = new Set(existing.map((row) => row.slug));

    const metadata = (input: ProjectSkillInput) => {
      return {
        description: input.description ?? null,
        disableModelInvocation: input.disableModelInvocation ?? null,
        ingestedAt,
        orphanedAt: null,
        outcomeTelemetry: input.outcomeTelemetry ?? null,
        source: input.source,
        sourcePath: input.sourcePath,
        sourceUrl: input.sourceUrl ?? null,
      };
    };

    const inserts = inputs
      .filter((input) => !existingSlugs.has(input.slug))
      .map((input) => {
        return {
          ...metadata(input),
          projectId,
          slug: input.slug,
          tags: [],
        };
      });
    const updates = inputs.filter((input) => existingSlugs.has(input.slug));

    await this.createMany(inserts);
    await Promise.all(
      updates.map((input) => {
        return this.updateMany(
          { projectId, slug: input.slug },
          metadata(input),
        );
      }),
    );

    const keepSlugs = new Set(inputs.map((input) => input.slug));
    const staleRows = existing.filter((row) => !keepSlugs.has(row.slug));
    const staleSlugs = staleRows
      .map((row) => row.slug)
      .sort((left, right) => left.localeCompare(right));

    await Promise.all(
      staleRows
        .filter((row) => row.orphanedAt == null)
        .map((row) => {
          return this.updateMany(
            { projectId, slug: row.slug },
            { orphanedAt: ingestedAt },
          );
        }),
    );

    return { staleSlugs, upserted: inputs.length };
  }

  /**
   * @description Soft deletes one live skill by (projectId, slug). Returns true when a row was
   * removed. Distinct from the ingest reconcile: orphans stay until this explicit remove.
   */
  async removeBySlug(projectId: string, slug: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ projectId, slug });
    return removedCount > 0;
  }
}
