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
