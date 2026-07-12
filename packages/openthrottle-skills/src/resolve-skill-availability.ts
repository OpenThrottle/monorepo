/**
 * The environments a caller can resolve skill availability for. Callers declare
 * their own — the server cannot sniff a caller's process env (Ralph passes
 * `ralph`, the developer app `interactive`, CI `ci`). `interactive` is the
 * default when a context omits `environment`. See
 * docs/monorepo/skill-availability-design.md ("Attribute model").
 * @public
 */
export const SKILL_AVAILABILITY_ENVIRONMENTS = [
  'ci',
  'interactive',
  'ralph',
] as const;

/** @public */
export type SkillAvailabilityEnvironment =
  (typeof SKILL_AVAILABILITY_ENVIRONMENTS)[number];

/** The default environment applied when a context omits `environment`. */
const DEFAULT_SKILL_AVAILABILITY_ENVIRONMENT: SkillAvailabilityEnvironment =
  'interactive';

/** @public */
export type SkillAvailabilityPosture = 'allow' | 'deny';

/**
 * Resolution context. `environment` defaults to `interactive` when omitted.
 *
 * `editor` and `role` are **reserved-inert**: accepted so callers and storage
 * can carry them forward without a signature change, but the v1 resolver
 * ignores them entirely (adding them later as real axes is additive). See
 * docs/monorepo/skill-availability-design.md ("Attribute model").
 * @public
 */
export interface SkillAvailabilityContext {
  /** Reserved-inert in v1: accepted and ignored by the resolver. */
  readonly editor?: string;
  /** Caller-declared environment; defaults to `interactive` when omitted. */
  readonly environment?: SkillAvailabilityEnvironment;
  /** Reserved-inert in v1: accepted and ignored by the resolver. */
  readonly role?: string;
}

/**
 * A single per-project availability rule. Empty allow/deny arrays are legal.
 * `environment` is `null` for an environment-agnostic rule (applies to every
 * environment) or a specific environment to scope the rule to it.
 * @public
 */
export interface SkillAvailabilityRule {
  /** `null` applies to all environments; a value scopes the rule to it. */
  readonly environment: SkillAvailabilityEnvironment | null;
  /** Stable rule identifier, used in provenance strings and tie-breaks. */
  readonly id: string;
  /** Slugs this rule allows (rung 1). */
  readonly slugAllow: readonly string[];
  /** Slugs this rule denies (rung 1). */
  readonly slugDeny: readonly string[];
  /** Tags this rule allows (rung 2). */
  readonly tagAllow: readonly string[];
  /** Tags this rule denies (rung 2). */
  readonly tagDeny: readonly string[];
}

/**
 * A project's rule set. At most one exists per project; callers pass
 * `undefined` when the project has none (⇒ passthrough, invariant 3).
 * @public
 */
export interface SkillAvailabilityRuleSet {
  /**
   * The single per-project posture (rung 3). `deny` ⇒ nothing model-invocable
   * except explicit allows; `allow` ⇒ falls through to frontmatter.
   */
  readonly posture: SkillAvailabilityPosture;
  /** Zero or more rules evaluated at rungs 1–2. */
  readonly rules: readonly SkillAvailabilityRule[];
}

/**
 * A skill's resolver input: slug, static `tags`, and the tri-state static
 * `disable-model-invocation` flag (`undefined` when the key is omitted).
 * Structurally a subset of `ProjectSkillInput`, so those rows are assignable.
 * @public
 */
export interface SkillAvailabilityInput {
  /** Static `disable-model-invocation`, tri-state (`true`/`false`/`undefined`). */
  readonly disableModelInvocation: boolean | undefined;
  /** Kebab-case skill slug. */
  readonly slug: string;
  /** Static `tags`; an empty list when the skill declares none. */
  readonly tags: readonly string[];
}

/** A single resolved skill in {@link SkillAvailabilityResult}. @public */
export interface ResolvedSkillAvailability {
  /** The resolved per-context flag; `true` ⇒ auto-invocation suppressed. */
  readonly effectiveDisableModelInvocation: boolean;
  /** The decisive rung's provenance string (closed grammar). */
  readonly provenance: string;
  /** The skill's slug (input order is preserved across the result). */
  readonly slug: string;
  /** The static frontmatter flag, tri-state, passed through unchanged. */
  readonly staticDisableModelInvocation: boolean | undefined;
}

/** @public */
export interface SkillAvailabilityResult {
  /** Resolved skills, in the same order as the input. */
  readonly skills: readonly ResolvedSkillAvailability[];
  /** Resolve-time warnings (e.g. `unknown-tag:<tag>@<slug>`), deduped. */
  readonly warnings: readonly string[];
}

/** Deterministic, locale-independent lexicographic string comparison. */
const compareStrings = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

/** A match produced at the slug rung (rung 1). */
interface SlugMatch {
  readonly envSpecific: boolean;
  readonly polarity: SkillAvailabilityPosture;
  readonly ruleId: string;
}

/** A match produced at the tag rung (rung 2). */
interface TagMatch {
  readonly envSpecific: boolean;
  readonly polarity: SkillAvailabilityPosture;
  readonly ruleId: string;
  readonly tag: string;
}

/**
 * Within-rung specificity + polarity resolution, shared by both rungs.
 * (a) if any match came from an environment-specific rule, discard
 * environment-agnostic matches; (b) among survivors, deny wins over allow.
 * Returns the winning polarity and the survivors of that polarity, or
 * `undefined` when there are no matches (rung is not decisive).
 */
const resolveWinningMatches = <
  TMatch extends {
    readonly envSpecific: boolean;
    readonly polarity: SkillAvailabilityPosture;
  },
>(
  matches: readonly TMatch[],
):
  | {
      readonly polarity: SkillAvailabilityPosture;
      readonly winners: readonly TMatch[];
    }
  | undefined => {
  if (matches.length === 0) {
    return undefined;
  }

  const hasEnvSpecific = matches.some((match) => match.envSpecific);
  const bySpecificity = hasEnvSpecific
    ? matches.filter((match) => match.envSpecific)
    : matches;

  const polarity: SkillAvailabilityPosture = bySpecificity.some(
    (match) => match.polarity === 'deny',
  )
    ? 'deny'
    : 'allow';

  const winners = bySpecificity.filter((match) => match.polarity === polarity);

  return { polarity, winners };
};

/** Resolves rung 1 (exact-slug allow/deny), or `undefined` if not decisive. */
const resolveSlugRung = (
  slug: string,
  rules: readonly SkillAvailabilityRule[],
): { readonly effective: boolean; readonly provenance: string } | undefined => {
  const matches: SlugMatch[] = [];

  for (const rule of rules) {
    const envSpecific = rule.environment !== null;
    if (rule.slugDeny.includes(slug)) {
      matches.push({ envSpecific, polarity: 'deny', ruleId: rule.id });
    }
    if (rule.slugAllow.includes(slug)) {
      matches.push({ envSpecific, polarity: 'allow', ruleId: rule.id });
    }
  }

  const resolved = resolveWinningMatches(matches);
  if (resolved === undefined) {
    return undefined;
  }

  const [winner] = [...resolved.winners].sort((a, b) =>
    compareStrings(a.ruleId, b.ruleId),
  );
  if (winner === undefined) {
    return undefined;
  }

  return {
    effective: resolved.polarity === 'deny',
    provenance: `slug-${resolved.polarity}:${slug}@${winner.ruleId}`,
  };
};

/** Resolves rung 2 (tag allow/deny over vocabulary tags), or `undefined`. */
const resolveTagRung = (
  participatingTags: readonly string[],
  rules: readonly SkillAvailabilityRule[],
): { readonly effective: boolean; readonly provenance: string } | undefined => {
  const matches: TagMatch[] = [];

  for (const rule of rules) {
    const envSpecific = rule.environment !== null;
    for (const tag of participatingTags) {
      if (rule.tagDeny.includes(tag)) {
        matches.push({ envSpecific, polarity: 'deny', ruleId: rule.id, tag });
      }
      if (rule.tagAllow.includes(tag)) {
        matches.push({ envSpecific, polarity: 'allow', ruleId: rule.id, tag });
      }
    }
  }

  const resolved = resolveWinningMatches(matches);
  if (resolved === undefined) {
    return undefined;
  }

  const [winner] = [...resolved.winners].sort(
    (a, b) =>
      compareStrings(a.tag, b.tag) || compareStrings(a.ruleId, b.ruleId),
  );
  if (winner === undefined) {
    return undefined;
  }

  return {
    effective: resolved.polarity === 'deny',
    provenance: `tag-${resolved.polarity}:${winner.tag}@${winner.ruleId}`,
  };
};

/** Resolves rung 4 (static frontmatter), always decisive. */
const resolveFrontmatterRung = (
  staticDisableModelInvocation: boolean | undefined,
): { readonly effective: boolean; readonly provenance: string } => {
  if (staticDisableModelInvocation === true) {
    return { effective: true, provenance: 'frontmatter:true' };
  }
  if (staticDisableModelInvocation === false) {
    return { effective: false, provenance: 'frontmatter:false' };
  }
  return { effective: false, provenance: 'frontmatter:unset' };
};

/**
 * @description Pure, context-aware resolver for a skill's *effective*
 * `disable-model-invocation`. Evaluates the reviewed precedence ladder per
 * skill, top-down, first decisive rung wins:
 *
 * 0. **Environment pre-filter** — keep rules whose `environment` is `null` or
 *    equals the context environment (default `interactive`).
 * 1. **Slug** allow/deny for the exact slug.
 * 2. **Tag** allow/deny for any of the skill's tags. Only tags present in
 *    `vocabulary` participate; a skill tag absent from the vocabulary emits an
 *    `unknown-tag:<tag>@<slug>` warning (deduped) and is skipped for matching
 *    (invariant 4). Rule-side tags that reference unknown tags simply never
 *    match — no warning.
 * 3. **Posture** — `deny` ⇒ off (`posture:deny`); `allow` falls through.
 * 4. **Frontmatter** — `true` ⇒ off, `false`/unset ⇒ on.
 *
 * Within rungs 1–2, conflicts resolve in strict order: (a) if any matching
 * rule is environment-specific, environment-agnostic matches are discarded;
 * (b) among survivors, deny wins over allow. When several matches survive, the
 * named tag/rule is the alphabetically first (slug rung: by rule id; tag rung:
 * by tag then rule id).
 *
 * When `ruleSet` is `undefined` the project has no rules: rungs 0–3 are
 * skipped and every skill resolves to its frontmatter rung, so
 * `effectiveDisableModelInvocation === (staticDisableModelInvocation ?? false)`
 * (invariant 3, passthrough). Result skills preserve input order. `context`'s
 * `editor`/`role` are ignored (reserved-inert).
 *
 * Pure — no I/O. See docs/monorepo/skill-availability-design.md.
 * @public
 */
export const resolveSkillAvailability = (
  context: SkillAvailabilityContext,
  skills: readonly SkillAvailabilityInput[],
  ruleSet: SkillAvailabilityRuleSet | undefined,
  vocabulary: readonly string[],
): SkillAvailabilityResult => {
  const environment =
    context.environment ?? DEFAULT_SKILL_AVAILABILITY_ENVIRONMENT;
  const vocabularySet = new Set(vocabulary);

  const applicableRules =
    ruleSet === undefined
      ? []
      : ruleSet.rules.filter(
          (rule) =>
            rule.environment === null || rule.environment === environment,
        );

  const warnings = new Set<string>();
  const resolvedSkills: ResolvedSkillAvailability[] = [];

  for (const skill of skills) {
    const frontmatter = resolveFrontmatterRung(skill.disableModelInvocation);

    if (ruleSet === undefined) {
      resolvedSkills.push({
        effectiveDisableModelInvocation: frontmatter.effective,
        provenance: frontmatter.provenance,
        slug: skill.slug,
        staticDisableModelInvocation: skill.disableModelInvocation,
      });
      continue;
    }

    // Rung 1: exact-slug allow/deny.
    const slugDecision = resolveSlugRung(skill.slug, applicableRules);
    if (slugDecision !== undefined) {
      resolvedSkills.push({
        effectiveDisableModelInvocation: slugDecision.effective,
        provenance: slugDecision.provenance,
        slug: skill.slug,
        staticDisableModelInvocation: skill.disableModelInvocation,
      });
      continue;
    }

    // Rung 2: tag allow/deny, restricted to vocabulary tags. Unknown tags warn
    // and are skipped for matching.
    const participatingTags: string[] = [];
    for (const tag of skill.tags) {
      if (vocabularySet.has(tag)) {
        participatingTags.push(tag);
      } else {
        warnings.add(`unknown-tag:${tag}@${skill.slug}`);
      }
    }

    const tagDecision = resolveTagRung(participatingTags, applicableRules);
    if (tagDecision !== undefined) {
      resolvedSkills.push({
        effectiveDisableModelInvocation: tagDecision.effective,
        provenance: tagDecision.provenance,
        slug: skill.slug,
        staticDisableModelInvocation: skill.disableModelInvocation,
      });
      continue;
    }

    // Rung 3: posture. Only `deny` is decisive; `allow` falls through.
    if (ruleSet.posture === 'deny') {
      resolvedSkills.push({
        effectiveDisableModelInvocation: true,
        provenance: 'posture:deny',
        slug: skill.slug,
        staticDisableModelInvocation: skill.disableModelInvocation,
      });
      continue;
    }

    // Rung 4: frontmatter.
    resolvedSkills.push({
      effectiveDisableModelInvocation: frontmatter.effective,
      provenance: frontmatter.provenance,
      slug: skill.slug,
      staticDisableModelInvocation: skill.disableModelInvocation,
    });
  }

  return { skills: resolvedSkills, warnings: [...warnings] };
};
