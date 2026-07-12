/**
 * @description GraphQL resolver for per-project skill-availability rules. The read query
 * (skillAvailabilityRuleSet) returns the project's rule set mapped onto the resolver shape, or null
 * for passthrough. Mutations create/update the rule set posture and its rules.
 *
 * Auth stances mirror the sibling skill features: the read query is authenticated-only (Path A, the
 * projectSkills stance — no explicit permission); the mutations require settings:write (the
 * skill-tags mutation stance). For addRule/updateRule the resolver fetches the caller's skill-tag
 * vocabulary (SkillTagsService.listForUser) and passes it as `knownTags`, so the service can reject
 * tag references outside the user's vocabulary. Mirrored by the openthrottle-mcp
 * get/upsert/delete/add/update/remove_skill_availability_rule(_set) tools.
 */

import type { SkillAvailabilityRule } from '@openthrottle/nestjs-repositories';
import {
  SkillAvailabilityService,
  SkillTagsService,
} from '@openthrottle/nestjs-repositories';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { SkillAvailabilityRuleInput } from './skill-availability.input';
import {
  SkillAvailabilityRuleObject,
  SkillAvailabilityRuleSetObject,
} from './skill-availability.object';

/** Minimal shape shared by the resolver rule type and the stored entity, for mapping to the object. */
interface RuleLike {
  readonly environment: string | null;
  readonly id: string;
  readonly slugAllow: readonly string[];
  readonly slugDeny: readonly string[];
  readonly tagAllow: readonly string[];
  readonly tagDeny: readonly string[];
}

function toRuleObject(rule: RuleLike): SkillAvailabilityRuleObject {
  return {
    environment: rule.environment,
    id: rule.id,
    slugAllow: [...rule.slugAllow],
    slugDeny: [...rule.slugDeny],
    tagAllow: [...rule.tagAllow],
    tagDeny: [...rule.tagDeny],
  };
}

// @authz-stance: authenticated-only (Path A) for the read query; mutations require settings:write.
@Resolver(() => SkillAvailabilityRuleSetObject)
export class SkillAvailabilityResolver {
  constructor(
    private readonly skillAvailabilityService: SkillAvailabilityService,
    private readonly skillTagsService: SkillTagsService,
  ) {}

  @Query(() => SkillAvailabilityRuleSetObject, {
    description: `A project's skill-availability rule set (posture + rules), or null when the project has no rules (passthrough). Feeds resolveSkillAvailability.`,
    nullable: true,
  })
  async skillAvailabilityRuleSet(
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<SkillAvailabilityRuleSetObject | null> {
    const ruleSet =
      await this.skillAvailabilityService.getRuleSetForProject(projectId);
    if (ruleSet === undefined) {
      return null;
    }
    return { posture: ruleSet.posture, rules: ruleSet.rules.map(toRuleObject) };
  }

  @Mutation(() => SkillAvailabilityRuleSetObject, {
    description: `Create or update a project's rule set, setting its posture ("allow" | "deny"). Idempotent per project.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async upsertSkillAvailabilityRuleSet(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('posture', { type: () => String }) posture: string,
  ): Promise<SkillAvailabilityRuleSetObject> {
    await this.skillAvailabilityService.upsertRuleSet(projectId, { posture });
    const ruleSet =
      await this.skillAvailabilityService.getRuleSetForProject(projectId);
    return {
      posture: ruleSet?.posture ?? posture,
      rules: (ruleSet?.rules ?? []).map(toRuleObject),
    };
  }

  @Mutation(() => Boolean, {
    description: `Delete a project's rule set (cascading its rules). Returns false when the project had no rule set.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteSkillAvailabilityRuleSet(
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<boolean> {
    return this.skillAvailabilityService.deleteRuleSet(projectId);
  }

  @Mutation(() => SkillAvailabilityRuleObject, {
    description: `Add a rule to a project's rule set (creating the rule set with the default "allow" posture if absent). Tag references are validated against the caller's skill-tag vocabulary.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async addSkillAvailabilityRule(
    @CurrentUser('sub') userId: string,
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('input', { type: () => SkillAvailabilityRuleInput })
    input: SkillAvailabilityRuleInput,
  ): Promise<SkillAvailabilityRuleObject> {
    const knownTags = await this.resolveKnownTags(userId);
    const rule: SkillAvailabilityRule =
      await this.skillAvailabilityService.addRule(
        projectId,
        { ...input },
        knownTags,
      );
    return toRuleObject(rule);
  }

  @Mutation(() => SkillAvailabilityRuleObject, {
    description: `Replace a rule's tag/slug lists and environment by rule id. Tag references are validated against the caller's skill-tag vocabulary.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateSkillAvailabilityRule(
    @CurrentUser('sub') userId: string,
    @Args('ruleId', { type: () => ID }) ruleId: string,
    @Args('input', { type: () => SkillAvailabilityRuleInput })
    input: SkillAvailabilityRuleInput,
  ): Promise<SkillAvailabilityRuleObject> {
    const knownTags = await this.resolveKnownTags(userId);
    const rule: SkillAvailabilityRule =
      await this.skillAvailabilityService.updateRule(
        ruleId,
        { ...input },
        knownTags,
      );
    return toRuleObject(rule);
  }

  @Mutation(() => Boolean, {
    description: `Remove a rule by id. Returns false when the rule was not present.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async removeSkillAvailabilityRule(
    @Args('ruleId', { type: () => ID }) ruleId: string,
  ): Promise<boolean> {
    return this.skillAvailabilityService.removeRule(ruleId);
  }

  private async resolveKnownTags(userId: string): Promise<string[]> {
    const vocabulary = await this.skillTagsService.listForUser(userId);
    return vocabulary.map((entry) => entry.tag);
  }
}
