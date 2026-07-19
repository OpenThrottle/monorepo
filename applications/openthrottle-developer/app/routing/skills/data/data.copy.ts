/**
 * @description Single-sourced user-facing copy for the skills routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const SKILLS_EMPTY_COPY = {
  searchTitle: `No skills found, try clearing the search to see all skills.`,
  title: `No skills found, create your first skill to get started.`,
} as const;

/**
 * Copy for the effective-first "Model invocation" column and the skill detail
 * cards. The override indicator marks a skill whose resolved (effective) state
 * diverges from its static frontmatter value.
 */
export const SKILLS_MODEL_INVOCATION_COPY = {
  effectiveLabel: `Effective`,
  overrideIndicatorLabel: `Overridden by rule`,
  overrideTooltip: `Overridden by rule — see details`,
  provenanceLabel: `Provenance`,
  staticLabel: `Static`,
} as const;

/**
 * Copy for the "Source" provenance column and the toolbar source filter. A skill
 * is OpenThrottle-managed only when its frontmatter explicitly claims
 * `source: openthrottle`; everything else (including omitted keys) reads as
 * external, optionally with an origin URL.
 */
export const SKILLS_SOURCE_COPY = {
  columnHeader: `Source`,
  externalLabel: `External`,
  externalTooltip: `Installed from an external source.`,
  externalUrlTooltipPrefix: `Installed from`,
  filterAllLabel: `All`,
  filterExternalLabel: `External`,
  filterGroupLabel: `Filter by source`,
  filterOpenThrottleLabel: `OpenThrottle`,
  openthrottleLabel: `OpenThrottle`,
  openthrottleTooltip: `Authored and managed in this OpenThrottle monorepo.`,
} as const;

/**
 * Copy for the skill-availability authoring surface (posture, rules, vocabulary). All of this
 * concerns model auto-invocation only — human `/skill` invocation is never gated. Rename/remove
 * caveats are deliberately honest: those operations touch the workspace vocabulary alone and never
 * rewrite skill frontmatter or the rules that already reference a tag.
 */
export const SKILL_AVAILABILITY_COPY = {
  manageLink: `Manage availability`,
  pageDescription: `Control which skills a model may auto-invoke, per project and environment. Human /skill invocation is never gated by these rules.`,
  pageTitle: `Skill availability`,
  posture: {
    allowLabel: `Allow (passthrough)`,
    denyLabel: `Deny (default-deny)`,
    heading: `Project posture`,
    passthroughNote: `No rule set for this project — every skill resolves to its own frontmatter value (passthrough). Saving a posture below creates a rule set.`,
    postureAllowNote: `Allow: today's behavior. Every skill stays model-invocable unless a rule below denies it.`,
    postureDenyNote: `Deny: default-deny. No skill is model-invocable unless a rule below explicitly allows it (e.g. only github/terraform in an infra project).`,
    resetConfirmBody: `This deletes the rule set and all its rules, returning the project to passthrough (every skill resolves to its own frontmatter value). This cannot be undone.`,
    resetConfirmTitle: `Reset to passthrough?`,
    resetLabel: `Reset to passthrough`,
    saveLabel: `Save posture`,
  },
  rules: {
    addLabel: `Add rule`,
    emptyNote: `No rules yet. Add a rule to allow or deny skills by tag or slug.`,
    emptySlugError: `Enter at least one tag or slug to allow or deny — an empty rule is not allowed.`,
    environmentAllLabel: `All environments`,
    environmentLabel: `Environment`,
    heading: `Rules`,
    invalidSlugError: `Slugs must be kebab-case (lowercase, hyphen-separated). Fix:`,
    removeLabel: `Remove rule`,
    slugAllowLabel: `Slug allow`,
    slugAllowPlaceholder: `git-commit, pr-review`,
    slugDenyLabel: `Slug deny`,
    slugDenyPlaceholder: `deploy-checklist`,
    slugHelp: `Comma- or space-separated kebab-case skill slugs (one-off exceptions).`,
    tagAllowLabel: `Tag allow`,
    tagDenyLabel: `Tag deny`,
    tagHelp: `Tags are constrained to your workspace vocabulary below.`,
    updateLabel: `Save rule`,
  },
  vocabulary: {
    addLabel: `Add tag`,
    addPlaceholder: `pr-review`,
    caveat: `Renaming or removing a tag changes your workspace vocabulary only. It does NOT rewrite skill frontmatter or update existing rules that reference the tag — those keep the old name and must be updated by hand.`,
    emptyNote: `No tags yet. The 16 platform defaults seed on first read.`,
    heading: `Tag vocabulary`,
    invalidTagError: `Tags must be kebab-case (lowercase, hyphen-separated).`,
    removeLabel: `Remove`,
    renameLabel: `Rename`,
    renamePlaceholder: `new-name`,
    tagColumn: `Tag`,
  },
} as const;
