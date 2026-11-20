import { type SkillAvailabilityEnvironment } from '@openthrottle/openthrottle-skills';

/** @public */
export interface PlanContextResolvedSkill {
  readonly effectiveDisableModelInvocation: boolean;
  readonly matchedPlanTags: string[];
  readonly planRelevant: boolean;
  readonly provenance: string;
  readonly slug: string;
  readonly staticDisableModelInvocation: boolean | null;
}

/** @public */
export interface PlanContextAvailability {
  readonly effectiveDomainTags: string[];
  readonly skills: PlanContextResolvedSkill[];
  readonly warnings: string[];
}

/** @public */
export interface ResolveForPlanInput {
  /** Availability environment; the shipped resolver defaults to interactive. */
  readonly environment?: SkillAvailabilityEnvironment;
  readonly planId: string;
  /** Explicit project override; falls back to plan.projectId, then dogfood. */
  readonly projectId?: string | null;
  /** Task context; must belong to the plan. */
  readonly taskId?: string | null;
  /**
   * Whether reading the vocabulary may seed the platform defaults. Only a user principal has a
   * `users` row; pass false for a service account so the read writes nothing.
   */
  readonly vocabularySeedDefaults: boolean;
  /** Whose skill-tag vocabulary feeds the resolver (the reading identity). */
  readonly vocabularyUserId: string;
}
