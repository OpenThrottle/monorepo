/**
 * @description Plan-aware skill-availability resolution — the seam between the
 * shipped resolveSkillAvailability (NOT modified here) and plan/task tags.
 *
 * Given a plan (and optionally one of its tasks), this service assembles the
 * effective DOMAIN tag set (slice-2 rollup), evaluates the plan owner's
 * enabled availability-exception rules, materializes matched payloads as
 * EPHEMERAL resolver rule inputs (appended to the project's stored rules for
 * THIS evaluation only — never persisted to skill_availability_rules; the
 * shipped deny-wins ladder arbitrates), runs the shipped resolver unchanged,
 * and annotates every skill with matchedPlanTags (skill.tags ∩ effective
 * domain set) and planRelevant. Plan context never alters
 * effectiveDisableModelInvocation unless an availability-exception rule
 * matched — annotation is otherwise read-only.
 *
 * Consumed by the skillAvailability GraphQL query (planId/taskId args) and by
 * the inject-task executor's candidate-set gating.
 * See docs/monorepo/plan-task-tags-rules-design.md ("Action type 1").
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan } from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  ProjectsRepository,
  SkillTagsRepository,
  TagActionRulesRepository,
  TasksRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  availabilityExceptionActionPayloadSchema,
  evaluateTagActionRules,
  resolveSkillAvailability,
  type SkillAvailabilityInput,
  type SkillAvailabilityRule,
  type SkillAvailabilityRuleSet,
  TAG_ACTION_TYPES,
  type TagActionRuleInput,
} from '@openthrottle/openthrottle-skills';

import { ProjectSkillsService } from '../project-skills/project-skills.service.ts';
import { SkillAvailabilityService } from '../skill-availability/skill-availability.service.ts';
import { TagsService } from '../tags/tags.service.ts';
import type {
  PlanContextAvailability,
  PlanContextResolvedSkill,
  ResolveForPlanInput,
} from './plan-context-availability.types.ts';

/** nx_project_name of the dogfood project (the projectSkills anchor). */
const DOGFOOD_NX_PROJECT_NAME = 'OpenThrottle/monorepo';

@Injectable()
export class PlanContextAvailabilityService {
  constructor(
    private readonly logger: LoggerService,
    private readonly plansRepository: PlansRepository,
    private readonly projectSkillsService: ProjectSkillsService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly skillAvailabilityService: SkillAvailabilityService,
    private readonly skillTagsRepository: SkillTagsRepository,
    private readonly tagActionRulesRepository: TagActionRulesRepository,
    private readonly tagsService: TagsService,
    private readonly tasksRepository: TasksRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  /**
   * @description Resolves the plan-context availability universe. Returns
   * null skills only through an empty array (no resolvable project).
   */
  async resolveForPlan(
    input: ResolveForPlanInput,
  ): Promise<PlanContextAvailability> {
    const plan = await this.plansRepository.findOne({
      where: { id: input.planId },
    });
    if (plan == null) {
      throw new NotFoundException(`Plan "${input.planId}" not found.`);
    }
    await this.assertTaskBelongsToPlan(input.planId, input.taskId ?? null);

    const effective = await this.tagsService.getEffectiveTagSet(
      input.planId,
      input.taskId ?? undefined,
    );
    const effectiveDomainTags = effective
      .filter((tag) => tag.dimension === 'domain')
      .map((tag) => tag.tag);

    const ephemeralRules = await this.materializeExceptionRules(
      plan,
      effective.map((tag) => tag.tag),
      input.environment ?? null,
    );

    const projectId =
      input.projectId ??
      plan.projectId ??
      (await this.resolveDogfoodProjectId());
    if (projectId == null) {
      return { effectiveDomainTags, skills: [], warnings: [] };
    }

    const [views, vocabulary, storedRuleSet] = await Promise.all([
      this.projectSkillsService.getSkillsForProject(projectId),
      this.skillTagsRepository.listVocabularyTags(input.vocabularyUserId, {
        seedDefaults: input.vocabularySeedDefaults,
      }),
      this.skillAvailabilityService.getRuleSetForProject(projectId),
    ]);

    const skillInputs: SkillAvailabilityInput[] = views.map((view) => ({
      disableModelInvocation: view.staticDisableModelInvocation,
      slug: view.slug,
      tags: view.tags,
    }));

    // Ephemeral exception rules append AFTER the stored rules for this
    // evaluation only. A plan with neither stored nor ephemeral rules keeps
    // pure passthrough (undefined rule set).
    const hasNoRules = storedRuleSet == null && ephemeralRules.length === 0;
    const mergedRuleSet: SkillAvailabilityRuleSet = {
      posture: storedRuleSet?.posture ?? 'allow',
      rules: [...(storedRuleSet?.rules ?? []), ...ephemeralRules],
    };
    const ruleSet = hasNoRules ? undefined : mergedRuleSet;

    const result = resolveSkillAvailability(
      { environment: input.environment },
      skillInputs,
      ruleSet,
      vocabulary,
    );

    const domainTagSet = new Set(effectiveDomainTags);
    const tagsBySlug = new Map(views.map((view) => [view.slug, view.tags]));
    const skills: PlanContextResolvedSkill[] = result.skills.map((skill) => {
      const matchedPlanTags = (tagsBySlug.get(skill.slug) ?? [])
        .filter((tag) => domainTagSet.has(tag))
        .sort((a, b) => a.localeCompare(b));
      const planRelevant = matchedPlanTags.length > 0;
      const suffix = planRelevant
        ? `plan-context: matched [${matchedPlanTags.join(', ')}]`
        : 'plan-context: no tag overlap';
      return {
        effectiveDisableModelInvocation: skill.effectiveDisableModelInvocation,
        matchedPlanTags,
        planRelevant,
        provenance: `${skill.provenance}; ${suffix}`,
        slug: skill.slug,
        staticDisableModelInvocation:
          skill.staticDisableModelInvocation ?? null,
      };
    });

    return { effectiveDomainTags, skills, warnings: [...result.warnings] };
  }

  /**
   * @description The inject-task candidate-set gate: false (available) when
   * no project universe is resolvable; otherwise the slug must exist with
   * model invocation not effectively disabled in plan context.
   */
  async isSkillUnavailableForPlan(
    planId: string,
    skillSlug: string,
    vocabularyUserId: string,
  ): Promise<boolean> {
    // vocabularyUserId is the rule owner, a user principal, so first-read
    // seeding is safe here.
    const availability = await this.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId,
    });
    if (availability.skills.length === 0) {
      return false;
    }

    const skill = availability.skills.find(
      (candidate) => candidate.slug === skillSlug,
    );
    return skill == null || skill.effectiveDisableModelInvocation;
  }

  private async assertTaskBelongsToPlan(
    planId: string,
    taskId: string | null,
  ): Promise<void> {
    if (taskId == null) {
      return;
    }
    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (task == null || task.planId !== planId) {
      throw new BadRequestException(
        `Task "${taskId}" does not belong to plan "${planId}".`,
      );
    }
  }

  /**
   * @description Evaluates the plan owner's enabled rules and materializes
   * matched availability-exception payloads as ephemeral resolver rules. The
   * payloads are Zod-validated at rule write time; a stored payload failing
   * to parse here is logged and skipped rather than failing the read.
   */
  private async materializeExceptionRules(
    plan: Plan,
    effectiveTags: readonly string[],
    environment: string | null,
  ): Promise<SkillAvailabilityRule[]> {
    const owner = await this.usersRepository.findByGithubUsername(plan.author);
    if (owner == null) {
      return [];
    }

    const rules = await this.tagActionRulesRepository.listEnabledForUser(
      owner.id,
    );
    const ruleInputs: TagActionRuleInput[] = rules.map((rule) => ({
      actionPayload: rule.actionPayload,
      actionType: rule.actionType,
      enabled: rule.enabled,
      environment: rule.environment,
      id: rule.id,
      projectId: rule.projectId,
      status: rule.status,
      tagAll: rule.tagAll,
    }));

    const matched = evaluateTagActionRules(
      {
        effectiveTags,
        environment,
        planStatus: plan.status,
        projectId: plan.projectId,
      },
      ruleInputs,
    );

    const ephemeral: SkillAvailabilityRule[] = [];
    for (const action of matched) {
      if (action.actionType !== TAG_ACTION_TYPES.AVAILABILITY_EXCEPTION) {
        continue;
      }
      const parsed = availabilityExceptionActionPayloadSchema.safeParse(
        action.actionPayload,
      );
      if (!parsed.success) {
        this.logger.warn(
          `Skipping availability-exception rule ${action.ruleId}: stored payload failed validation`,
          PlanContextAvailabilityService.name,
        );
        continue;
      }
      ephemeral.push({
        environment: null,
        id: `rule:${action.ruleId} (plan-context)`,
        slugAllow: parsed.data.slugAllow,
        slugDeny: parsed.data.slugDeny,
        tagAllow: parsed.data.tagAllow,
        tagDeny: parsed.data.tagDeny,
      });
    }
    return ephemeral;
  }

  private async resolveDogfoodProjectId(): Promise<string | null> {
    const project = await this.projectsRepository.findByNxProjectName(
      DOGFOOD_NX_PROJECT_NAME,
    );
    return project?.id ?? null;
  }
}
