/**
 * @description GraphQL resolver for the per-project skill universe (`projectSkills`).
 * Reads the ingested `project_skills` rows via ProjectSkillsService — no disk access,
 * the DB is the single source. This is the display-only "quick win" (static flag +
 * tags) from docs/monorepo/skill-availability-design.md ("Surfacing"); it does NOT
 * resolve per-context effective availability (rules/posture are a later task).
 *
 * When `projectId` is omitted the query resolves the dogfood monorepo project by
 * `nx_project_name = 'monorepo'` (the same anchor scripts/openthrottle-ingest-agent-assets.ts
 * uses). It only *finds* the project — no find-or-create — and returns an empty list
 * when the project (or its ingested rows) is absent, so the developer app degrades
 * gracefully on a DB that has not yet been migrated/ingested.
 */

import type { ProjectSkillView } from '@openthrottle/nestjs-repositories';
import {
  ProjectSkillsService,
  ProjectsService,
} from '@openthrottle/nestjs-repositories';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  ProjectSkillObject,
  ProjectSkillsResult,
} from './project-skill.object';

/** nx_project_name of the dogfood project the monorepo's own skills reconcile into. */
const DOGFOOD_NX_PROJECT_NAME = 'monorepo';

function toObject(view: ProjectSkillView): ProjectSkillObject {
  return {
    description: view.description ?? null,
    slug: view.slug,
    source: view.source,
    sourceUrl: view.sourceUrl ?? null,
    staticDisableModelInvocation: view.staticDisableModelInvocation ?? null,
    tags: [...view.tags],
  };
}

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => ProjectSkillObject)
export class ProjectSkillsResolver {
  constructor(
    private readonly projectSkillsService: ProjectSkillsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Query(() => ProjectSkillsResult, {
    description: `A project's ingested skill universe: slug, static frontmatter tags, and the tri-state static disable-model-invocation flag. Omit projectId to resolve the dogfood monorepo project (nx_project_name = 'monorepo'); returns an empty list when the project or its ingested rows are absent. Display-only in v1 — no per-context effective availability.`,
  })
  async projectSkills(
    @Args('projectId', { nullable: true, type: () => ID })
    projectId?: string,
  ): Promise<ProjectSkillsResult> {
    const resolvedProjectId =
      projectId ?? (await this.resolveDogfoodProjectId());

    if (resolvedProjectId == null) {
      return { skills: [], totalCount: 0 };
    }

    const views =
      await this.projectSkillsService.getSkillsForProject(resolvedProjectId);
    const skills = views.map(toObject);

    return { skills, totalCount: skills.length };
  }

  private async resolveDogfoodProjectId(): Promise<string | null> {
    const project = await this.projectsService.findByNxProjectName(
      DOGFOOD_NX_PROJECT_NAME,
    );

    return project?.id ?? null;
  }
}
