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

import { CurrentUser } from '@openthrottle/nestjs-auth';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import type { ProjectSkillView } from '@openthrottle/nestjs-repositories';
import {
  ProjectSkillsService,
  ProjectsService,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { resolveTagCaller } from '../tags/tags.resolver';
import {
  ProjectSkillObject,
  ProjectSkillsResult,
} from './project-skill.object';
import {
  AddProjectSkillTagInput,
  RemoveProjectSkillTagInput,
} from './project-skills.input';

/** nx_project_name of the dogfood project the monorepo's own skills reconcile into. */
const DOGFOOD_NX_PROJECT_NAME = 'OpenThrottle/monorepo';

function toObject(view: ProjectSkillView): ProjectSkillObject {
  return {
    description: view.description ?? null,
    orphanedAt: view.orphanedAt ?? null,
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
    private readonly serviceAccountsService: ServiceAccountsService,
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
      return { orphanSlugs: [], skills: [], totalCount: 0 };
    }

    const views =
      await this.projectSkillsService.getSkillsForProject(resolvedProjectId);
    const skills = views.map(toObject);
    const orphanSlugs = views
      .filter((view) => view.orphanedAt != null)
      .map((view) => view.slug);

    return { orphanSlugs, skills, totalCount: skills.length };
  }

  @Mutation(() => Boolean, {
    description: `Delete one project_skills row by slug. Distinct from ingest: vanished skills stay as orphans until this explicit remove. Omit projectId to target the dogfood monorepo project. Returns false when no row matched.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async removeProjectSkill(
    @Args('slug', { type: () => String }) slug: string,
    @Args('projectId', { nullable: true, type: () => ID })
    projectId?: string,
  ): Promise<boolean> {
    const resolvedProjectId =
      projectId ?? (await this.resolveDogfoodProjectId());

    if (resolvedProjectId == null) {
      return false;
    }

    return this.projectSkillsService.removeProjectSkill(
      resolvedProjectId,
      slug,
    );
  }

  @Mutation(() => ProjectSkillObject, {
    description: `Attach a domain tag to a project_skills row. The tag must be in the caller's skill-tag vocabulary; phase tags are rejected. Idempotent when the tag is already present. Omit projectId to target the dogfood monorepo project.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async addProjectSkillTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => AddProjectSkillTagInput })
    input: AddProjectSkillTagInput,
  ): Promise<ProjectSkillObject> {
    const resolvedProjectId =
      input.projectId ?? (await this.resolveDogfoodProjectId());

    if (resolvedProjectId == null) {
      throw new NotFoundException(
        'Dogfood monorepo project not found; pass projectId explicitly.',
      );
    }

    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const view = await this.projectSkillsService.addProjectSkillTag(
      caller,
      resolvedProjectId,
      input.slug,
      input.tag,
    );

    return toObject(view);
  }

  @Mutation(() => Boolean, {
    description: `Remove a tag from a project_skills row. Returns false when the row or tag is absent (never a 500). Omit projectId to target the dogfood monorepo project.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async removeProjectSkillTag(
    @Args('input', { type: () => RemoveProjectSkillTagInput })
    input: RemoveProjectSkillTagInput,
  ): Promise<boolean> {
    const resolvedProjectId =
      input.projectId ?? (await this.resolveDogfoodProjectId());

    if (resolvedProjectId == null) {
      return false;
    }

    return this.projectSkillsService.removeProjectSkillTag(
      resolvedProjectId,
      input.slug,
      input.tag,
    );
  }

  private async resolveDogfoodProjectId(): Promise<string | null> {
    const project = await this.projectsService.findByNxProjectName(
      DOGFOOD_NX_PROJECT_NAME,
    );

    return project?.id ?? null;
  }
}
