import type {
  ATTACH_PROMPT_PLACEMENTS,
  ATTACH_PROMPT_TYPES,
  SkillAvailabilityEnvironment,
} from '@openthrottle/openthrottle-skills';

/** @public */
export interface PlanContextResolvedSkill {
  readonly effectiveDisableModelInvocation: boolean;
  readonly matchedPlanTags: string[];
  readonly planRelevant: boolean;
  readonly provenance: string;
  readonly slug: string;
  readonly staticDisableModelInvocation: boolean | null;
}

/** The attachment facts an 'applied' attach-prompt ledger row records in `details`. */
export interface AttachedPromptDetails {
  readonly placement: (typeof ATTACH_PROMPT_PLACEMENTS)[number];
  readonly promptId: string;
  readonly promptType: (typeof ATTACH_PROMPT_TYPES)[number];
}

/**
 * A custom prompt an attach-prompt rule attached to the plan, as an agent composes it: `start`
 * prompts go before the plan context, `end` prompts after it.
 *
 * @public
 */
export interface PlanContextAttachedPrompt {
  readonly content: string;
  readonly filePath: string | null;
  readonly placement: (typeof ATTACH_PROMPT_PLACEMENTS)[number];
  readonly promptId: string;
  readonly promptType: (typeof ATTACH_PROMPT_TYPES)[number];
  /** The attach-prompt rule whose ledger row is the attachment. */
  readonly ruleId: string;
  readonly title: string;
}

/** @public */
export interface PlanContextAvailability {
  /** Attached prompts in composition order: every `start` one, then every `end` one. */
  readonly attachedPrompts: PlanContextAttachedPrompt[];
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
