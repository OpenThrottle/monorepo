/**
 * @description Single-sourced user-facing copy for the rules routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const RULES_NOT_FOUND_COPY = {
  description: `The rule you're looking for doesn't exist or was removed.`,
  title: `rule not found`,
} as const;

export const RULES_COPY = {
  actionDescription: `What happens when a plan matches.`,
  actionLegend: `Action`,
  actionTypeLabel: `Action type`,
  anyOption: `Any`,
  availabilityExceptionOption: `availability-exception`,
  cancelAction: `Cancel`,
  createTitle: `Create rule`,
  deleteAction: `Delete`,
  disableAction: `Disable`,
  domainTagsLabel: `Domain tags`,
  editAction: `Edit`,
  editTitle: `Edit rule`,
  emptyBody: `Rules map tag combinations on plans to actions — for example, injecting a /grilling task into every breakdown-tagged plan.`,
  emptyTitle: `No tag→action rules yet`,
  enableAction: `Enable`,
  environmentLabel: `Environment`,
  formDescription: `Name the rule, choose which plans it matches, and pick the action to dispatch.`,
  identityDescription: `A human-readable name so the rule is easy to find later.`,
  identityLegend: `Identity`,
  injectTaskOption: `inject-task`,
  matchDescription: `A plan matches when every selected tag is present (plus any status/environment filter).`,
  matchLegend: `Match`,
  matchesEveryPlan: `matches every plan`,
  newRuleAction: `New rule`,
  noTagsHint: `No tags selected — this rule matches every plan.`,
  pageTitle: `Rules`,
  phaseTagsLabel: `Phase tags`,
  placementLabel: `Placement`,
  saveAction: `Save rule`,
  skillLabel: `Skill`,
  skillPlaceholder: `Pick a skill…`,
  slugAllowPlaceholder: `slugAllow (comma-separated)`,
  slugDenyPlaceholder: `slugDeny (comma-separated)`,
  statusLabel: `Status`,
  tagAllowPlaceholder: `tagAllow (comma-separated)`,
  tagDenyPlaceholder: `tagDeny (comma-separated)`,
  titleLabel: `Title`,
  titlePlaceholder: `A human-readable name for this rule`,
  titleTemplatePlaceholder: `Title template (optional, {{plan.title}} interpolates)`,
} as const;
