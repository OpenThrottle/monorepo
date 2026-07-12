/**
 * @description Per-project skill-availability rule storage (skill_availability_rule_sets +
 * skill_availability_rules). Two levels: at most one rule SET per project (carrying the single
 * posture), owning zero or more RULES.
 *
 * `getRuleSetForProject` maps a project's stored rule set EXACTLY onto the resolver's
 * `SkillAvailabilityRuleSet` shape from @openthrottle/openthrottle-skills, so its output feeds
 * `resolveSkillAvailability` unchanged (posture + rules[] with id, environment, tag/slug
 * allow/deny). Returns `undefined` when the project has no rule set (⇒ passthrough).
 *
 * Writes validate with strict Zod schemas at write time (not resolve time). `addRule`/`updateRule`
 * additionally reject tag references outside the caller-supplied `knownTags` vocabulary, listing the
 * offenders — the service stays decoupled from any tag source (the resolver layer passes the user's
 * vocabulary). See docs/monorepo/skill-availability-design.md ("Rules" + "Precedence ladder").
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  SkillAvailabilityEnvironment,
  SkillAvailabilityPosture,
  SkillAvailabilityRuleSet as ResolvedSkillAvailabilityRuleSet,
} from '@openthrottle/openthrottle-skills';
import { SKILL_AVAILABILITY_ENVIRONMENTS } from '@openthrottle/openthrottle-skills';
import { Repository } from 'typeorm';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity';
import { SkillAvailabilityRule } from './skill-availability-rule.entity';
import {
  skillAvailabilityPostureSchema,
  skillAvailabilityRuleInputSchema,
  type SkillAvailabilityRuleInput,
  type SkillAvailabilityRuleInputArgs,
} from './skill-availability.schemas';

/** Narrows a stored posture string to the resolver's tri-safe posture (defaults to allow). */
const toPosture = (value: string): SkillAvailabilityPosture =>
  value === 'deny' ? 'deny' : 'allow';

/** Narrows a stored environment string (or null) to the resolver's environment union. */
const toEnvironment = (
  value: string | null,
): SkillAvailabilityEnvironment | null => {
  if (value === null) {
    return null;
  }
  const match = SKILL_AVAILABILITY_ENVIRONMENTS.find((env) => env === value);
  return match ?? null;
};

@Injectable()
export class SkillAvailabilityService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(SkillAvailabilityRuleSet)
    private readonly ruleSetRepository: Repository<SkillAvailabilityRuleSet>,
    @InjectRepository(SkillAvailabilityRule)
    private readonly ruleRepository: Repository<SkillAvailabilityRule>,
  ) {
    this.logger.debug('🧩 skill-availability 🧩');
  }

  /**
   * @description Returns a project's rule set mapped EXACTLY onto the resolver's
   * `SkillAvailabilityRuleSet` (posture + rules[]), or `undefined` when the project has no rule
   * set (⇒ passthrough). Rules are ordered by creation for deterministic output.
   */
  async getRuleSetForProject(
    projectId: string,
  ): Promise<ResolvedSkillAvailabilityRuleSet | undefined> {
    const ruleSet = await this.ruleSetRepository.findOne({
      where: { projectId },
    });
    if (!ruleSet) {
      return undefined;
    }

    const rules = await this.ruleRepository.find({
      order: { createdAt: 'ASC', id: 'ASC' },
      where: { ruleSetId: ruleSet.id },
    });

    return {
      posture: toPosture(ruleSet.posture),
      rules: rules.map((rule) => ({
        environment: toEnvironment(rule.environment),
        id: rule.id,
        slugAllow: rule.slugAllow,
        slugDeny: rule.slugDeny,
        tagAllow: rule.tagAllow,
        tagDeny: rule.tagDeny,
      })),
    };
  }

  /**
   * @description Creates or updates the project's single rule set, setting its posture. Idempotent
   * on (project_id). Rejects an invalid posture with an actionable error.
   */
  async upsertRuleSet(
    projectId: string,
    input: { posture: string },
  ): Promise<SkillAvailabilityRuleSet> {
    const posture = this.parsePosture(input.posture);

    const existing = await this.ruleSetRepository.findOne({
      where: { projectId },
    });
    if (existing) {
      existing.posture = posture;
      return this.ruleSetRepository.save(existing);
    }

    const created = this.ruleSetRepository.create({ posture, projectId });
    return this.ruleSetRepository.save(created);
  }

  /**
   * @description Deletes the project's rule set (cascading its rules). Returns false when the
   * project had no rule set.
   */
  async deleteRuleSet(projectId: string): Promise<boolean> {
    const result = await this.ruleSetRepository.delete({ projectId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Adds a rule to the project's rule set, creating the rule set with the default
   * `allow` posture if the project has none. Validates the input with the strict schema and rejects
   * tag references outside `knownTags` (the caller's vocabulary), listing the offenders.
   */
  async addRule(
    projectId: string,
    input: SkillAvailabilityRuleInputArgs,
    knownTags: readonly string[],
  ): Promise<SkillAvailabilityRule> {
    const parsed = this.parseRuleInput(input);
    this.assertKnownTags(parsed, knownTags);

    const ruleSet = await this.ensureRuleSet(projectId);
    const created = this.ruleRepository.create({
      environment: parsed.environment,
      ruleSetId: ruleSet.id,
      slugAllow: parsed.slugAllow,
      slugDeny: parsed.slugDeny,
      tagAllow: parsed.tagAllow,
      tagDeny: parsed.tagDeny,
    });
    return this.ruleRepository.save(created);
  }

  /**
   * @description Replaces a rule's tag/slug lists and environment by rule id. Validates the input
   * with the strict schema and rejects tag references outside `knownTags`. Throws when the rule id
   * is absent.
   */
  async updateRule(
    ruleId: string,
    input: SkillAvailabilityRuleInputArgs,
    knownTags: readonly string[],
  ): Promise<SkillAvailabilityRule> {
    const parsed = this.parseRuleInput(input);
    this.assertKnownTags(parsed, knownTags);

    const existing = await this.ruleRepository.findOne({
      where: { id: ruleId },
    });
    if (!existing) {
      throw new NotFoundException(
        `Skill-availability rule "${ruleId}" was not found.`,
      );
    }

    existing.environment = parsed.environment;
    existing.slugAllow = parsed.slugAllow;
    existing.slugDeny = parsed.slugDeny;
    existing.tagAllow = parsed.tagAllow;
    existing.tagDeny = parsed.tagDeny;
    return this.ruleRepository.save(existing);
  }

  /**
   * @description Removes a rule by id. Returns false when the rule was not present.
   */
  async removeRule(ruleId: string): Promise<boolean> {
    const result = await this.ruleRepository.delete({ id: ruleId });
    return (result.affected ?? 0) > 0;
  }

  /** Finds the project's rule set, creating it with the default `allow` posture if absent. */
  private async ensureRuleSet(
    projectId: string,
  ): Promise<SkillAvailabilityRuleSet> {
    const existing = await this.ruleSetRepository.findOne({
      where: { projectId },
    });
    if (existing) {
      return existing;
    }
    const created = this.ruleSetRepository.create({
      posture: 'allow',
      projectId,
    });
    return this.ruleSetRepository.save(created);
  }

  /** Parses and normalizes a rule input, mapping Zod issues to a BadRequestException. */
  private parseRuleInput(
    input: SkillAvailabilityRuleInputArgs,
  ): SkillAvailabilityRuleInput {
    const result = skillAvailabilityRuleInputSchema.safeParse(input);
    if (!result.success) {
      throw new BadRequestException(
        `Invalid skill-availability rule: ${this.formatIssues(result.error)}`,
      );
    }
    return result.data;
  }

  /** Parses a posture string, mapping Zod issues to a BadRequestException. */
  private parsePosture(posture: string): SkillAvailabilityPosture {
    const result = skillAvailabilityPostureSchema.safeParse(posture);
    if (!result.success) {
      throw new BadRequestException(
        `Invalid posture "${posture}": must be "allow" or "deny".`,
      );
    }
    return result.data;
  }

  /** Rejects tag references (allow + deny) outside the caller's vocabulary, listing offenders. */
  private assertKnownTags(
    input: SkillAvailabilityRuleInput,
    knownTags: readonly string[],
  ): void {
    const known = new Set(knownTags);
    const unknown = [
      ...new Set(
        [...input.tagAllow, ...input.tagDeny].filter((tag) => !known.has(tag)),
      ),
    ].sort();
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown tag(s) not in your vocabulary: ${unknown.join(', ')}. Add them to your skill-tag vocabulary first, or reference an existing tag.`,
      );
    }
  }

  /** Renders Zod issues as a compact `path: message` list for actionable errors. */
  private formatIssues(error: {
    issues: ReadonlyArray<{
      message: string;
      path: ReadonlyArray<PropertyKey>;
    }>;
  }): string {
    return error.issues
      .map((issue) => {
        const path = issue.path.map((segment) => String(segment)).join('.');
        return path === '' ? issue.message : `${path}: ${issue.message}`;
      })
      .join('; ');
  }
}
