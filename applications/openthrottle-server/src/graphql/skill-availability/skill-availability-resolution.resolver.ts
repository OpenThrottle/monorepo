/**
 * @description GraphQL resolver for the *resolved* per-context skill-availability surface
 * (`skillAvailability`). Composes the three server inputs — the project's ingested skill
 * universe (ProjectSkillsService), the caller's skill-tag vocabulary (SkillTagsService), and
 * the project's rule set (SkillAvailabilityService) — and runs the pure
 * `resolveSkillAvailability` resolver from @openthrottle/openthrottle-skills. The server is the
 * single resolution point; the developer app and external OT consumers read this query.
 *
 * When `projectId` is omitted the query resolves the dogfood monorepo project by
 * `nx_project_name = 'monorepo'` (the projectSkills anchor); an absent project (or its ingested
 * rows) yields an empty result. `environment` (default `interactive`) is validated against
 * SKILL_AVAILABILITY_ENVIRONMENTS and rejected with an actionable error when unknown. editor/role
 * are reserved and NOT exposed. Auth is authenticated-only (Path A — the projectSkills read
 * stance). Mirrored by the openthrottle-mcp `get_skill_availability` tool. See
 * docs/monorepo/skill-availability-design.md ("Output contract").
 */

import {
  ProjectSkillsService,
  ProjectsService,
  SkillAvailabilityService,
  SkillTagsService,
} from '@openthrottle/nestjs-repositories';
import type {
  SkillAvailabilityEnvironment,
  SkillAvailabilityInput,
} from '@openthrottle/openthrottle-skills';
import {
  resolveSkillAvailability,
  SKILL_AVAILABILITY_ENVIRONMENTS,
} from '@openthrottle/openthrottle-skills';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { BadRequestException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import {
  SkillAvailabilityResolutionResult,
  SkillAvailabilityResolvedSkillObject,
} from './skill-availability-resolution.object';

/** nx_project_name of the dogfood project the monorepo's own skills reconcile into. */
const DOGFOOD_NX_PROJECT_NAME = 'monorepo';

/** Narrows a caller-supplied string to a known environment without an `as` cast. */
function isKnownEnvironment(
  value: string,
): value is SkillAvailabilityEnvironment {
  return SKILL_AVAILABILITY_ENVIRONMENTS.some((known) => known === value);
}

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => SkillAvailabilityResolutionResult)
export class SkillAvailabilityResolutionResolver {
  constructor(
    private readonly projectSkillsService: ProjectSkillsService,
    private readonly projectsService: ProjectsService,
    private readonly skillAvailabilityService: SkillAvailabilityService,
    private readonly skillTagsService: SkillTagsService,
  ) {}

  @Query(() => SkillAvailabilityResolutionResult, {
    description: `Resolve every skill's effective disable-model-invocation for a project and environment. Omit projectId to resolve the dogfood monorepo project (nx_project_name = 'monorepo'); returns an empty result when the project or its ingested rows are absent. environment (ci | interactive | ralph, default interactive) is rejected when unknown. Concerns model auto-invocation only — human /skill invocation is never gated.`,
  })
  async skillAvailability(
    @CurrentUser('sub') userId: string,
    @Args('projectId', { nullable: true, type: () => ID })
    projectId?: string,
    @Args('environment', { nullable: true, type: () => String })
    environment?: string,
  ): Promise<SkillAvailabilityResolutionResult> {
    const resolvedEnvironment = this.validateEnvironment(environment);

    const resolvedProjectId =
      projectId ?? (await this.resolveDogfoodProjectId());
    if (resolvedProjectId == null) {
      return { skills: [], totalCount: 0, warnings: [] };
    }

    const [views, vocabulary, ruleSet] = await Promise.all([
      this.projectSkillsService.getSkillsForProject(resolvedProjectId),
      this.skillTagsService.listForUser(userId),
      this.skillAvailabilityService.getRuleSetForProject(resolvedProjectId),
    ]);

    const inputs: SkillAvailabilityInput[] = views.map((view) => ({
      disableModelInvocation: view.staticDisableModelInvocation,
      slug: view.slug,
      tags: view.tags,
    }));

    const result = resolveSkillAvailability(
      { environment: resolvedEnvironment },
      inputs,
      ruleSet,
      vocabulary.map((entry) => entry.tag),
    );

    const skills: SkillAvailabilityResolvedSkillObject[] = result.skills.map(
      (skill) => ({
        effectiveDisableModelInvocation: skill.effectiveDisableModelInvocation,
        provenance: skill.provenance,
        slug: skill.slug,
        staticDisableModelInvocation:
          skill.staticDisableModelInvocation ?? null,
      }),
    );

    return {
      skills,
      totalCount: skills.length,
      warnings: [...result.warnings],
    };
  }

  private validateEnvironment(
    environment: string | undefined,
  ): SkillAvailabilityEnvironment | undefined {
    if (environment === undefined) {
      return undefined;
    }
    if (!isKnownEnvironment(environment)) {
      throw new BadRequestException(
        `Unknown environment "${environment}". Valid environments: ${SKILL_AVAILABILITY_ENVIRONMENTS.join(', ')}.`,
      );
    }
    return environment;
  }

  private async resolveDogfoodProjectId(): Promise<string | null> {
    const project = await this.projectsService.findByNxProjectName(
      DOGFOOD_NX_PROJECT_NAME,
    );
    return project?.id ?? null;
  }
}
