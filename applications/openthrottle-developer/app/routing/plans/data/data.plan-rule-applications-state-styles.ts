/**
 * @description Badge styling per rule-application state for
 * {@link PlanRuleApplications}. Hoisted out of the component per
 * component-primitive-shape R4.
 */

export const PLAN_RULE_APPLICATION_STATE_STYLES: Record<string, string> = {
  applied: 'border-emerald-500/60 bg-emerald-500/10',
  flagged: 'border-red-500/60 bg-red-500/10',
  orphaned: 'border-amber-500/60 bg-amber-500/10',
  'pre-satisfied': 'border-sky-500/60 bg-sky-500/10',
};
