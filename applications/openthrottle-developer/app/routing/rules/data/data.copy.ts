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
  actionLegend: `Action`,
  cancelAction: `Cancel`,
  createTitle: `Create rule`,
  deleteAction: `Delete`,
  disableAction: `Disable`,
  editAction: `Edit`,
  editTitle: `Edit rule`,
  emptyBody: `Rules map tag combinations on plans to actions — for example, injecting a /grilling task into every breakdown-tagged plan.`,
  emptyTitle: `No tag→action rules yet`,
  enableAction: `Enable`,
  matchLegend: `Match (all selected tags must be present)`,
  matchesEveryPlan: `matches every plan`,
  newRuleAction: `New rule`,
  pageTitle: `Tag → action rules`,
  saveAction: `Save rule`,
  titleTemplatePlaceholder: `Title template (optional, {{plan.title}} interpolates)`,
} as const;
