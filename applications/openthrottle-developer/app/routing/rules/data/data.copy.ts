/**
 * @description Single-sourced user-facing copy for the rules routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import { WandSparklesIcon } from 'lucide-react';
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';

/**
 * @description New-user "teach-me-fast" onboarding copy for the rules index,
 * shown only when a user has zero rules and no filters are active. Conforms to
 * {@link GlobalFeatureOnboardingContent} and is rendered through the shared
 * `GlobalFeatureOnboarding` layout.
 */
export const RULES_ONBOARDING = {
  cta: { label: `Create your first rule`, to: `/rules/new` },
  icon: WandSparklesIcon,
  internalUsage: `We tag every plan by intent, then let rules do the wiring: a breakdown-tagged plan auto-gets a /grilling task, noisy skills stay off where they don't belong, and each project keeps its own defaults — so nobody hand-attaches the same skill twice.`,
  steps: [
    `Give the rule a clear name so it's easy to find later.`,
    `Pick the tag combination a plan must match — leave it empty to match every plan.`,
    `Choose the action to dispatch (inject a task, apply an availability exception, …).`,
    `Save it — new matching plans pick up the action automatically.`,
  ],
  tagline: `Automate the busywork: map tag combinations on plans to actions, so the right skills and tasks show up without anyone wiring them by hand.`,
  title: `Rules`,
  useCases: [
    `Auto-inject a skill or task into every plan carrying a given tag.`,
    `Silence skills that are noisy or irrelevant in the wrong context.`,
    `Give each project its own defaults with per-project rules.`,
  ],
  whatItIs: `Rules map a tag combination on a plan to an action — for example, injecting a /grilling task into every breakdown-tagged plan. A plan matches when all of a rule's tags are present, and the action fires automatically.`,
} satisfies GlobalFeatureOnboardingContent;

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
  clearFiltersAction: `Clear filters`,
  createTitle: `Create rule`,
  deleteAction: `Delete`,
  deleteConfirmCancel: `Cancel`,
  deleteConfirmDescriptionPrefix: `Delete rule`,
  deleteConfirmDescriptionSuffix: `? This cannot be undone.`,
  deleteConfirmLabel: `Delete`,
  deleteConfirmTitle: `Delete rule?`,
  disableAction: `Disable`,
  domainTagsLabel: `Domain tags`,
  editAction: `Edit`,
  editTitle: `Edit rule`,
  emptyBody: `Rules map tag combinations on plans to actions — for example, injecting a /grilling task into every breakdown-tagged plan.`,
  emptyTitle: `No tag→action rules yet`,
  enableAction: `Enable`,
  environmentLabel: `Environment`,
  filterAllLabel: `All`,
  filterDisabledLabel: `Disabled`,
  filterEnabledLabel: `Enabled`,
  filterGroupLabel: `Filter by enabled state`,
  filteredEmptyBody: `Try clearing the search or enabled filter to see all rules.`,
  filteredEmptyTitle: `No rules match your filters`,
  formDescription: `Name the rule, choose which plans it matches, and pick the action to dispatch.`,
  identityDescription: `A human-readable name so the rule is easy to find later.`,
  identityLegend: `Identity`,
  injectTaskOption: `inject-task`,
  matchDescription: `A plan matches when every selected tag is present (plus any status/environment filter).`,
  matchLegend: `Match`,
  matchesEveryPlan: `matches every plan`,
  menuAriaLabelPrefix: `Rule actions for`,
  newRuleAction: `New rule`,
  noTagsHint: `No tags selected — this rule matches every plan.`,
  pageDescription: `Map tag combinations on plans to actions — for example, injecting a skill task into every breakdown-tagged plan.`,
  pageTitle: `Rules`,
  phaseTagsLabel: `Phase tags`,
  placementLabel: `Placement`,
  saveAction: `Save rule`,
  searchAction: `Search`,
  searchAriaLabel: `Search rules`,
  searchPlaceholder: `Search by title, tags, or action…`,
  skillLabel: `Skill`,
  skillPlaceholder: `Pick a skill…`,
  slugAllowPlaceholder: `slugAllow (comma-separated)`,
  slugDenyPlaceholder: `slugDeny (comma-separated)`,
  statsDisabledLabel: `Disabled`,
  statsEnabledLabel: `Enabled`,
  statsTotalLabel: `Total rules`,
  statusLabel: `Status`,
  tableActionsHeader: `Actions`,
  tableMatchHeader: `Match`,
  tableRuleHeader: `Rule`,
  tagAllowPlaceholder: `tagAllow (comma-separated)`,
  tagDenyPlaceholder: `tagDeny (comma-separated)`,
  titleLabel: `Title`,
  titlePlaceholder: `A human-readable name for this rule`,
  titleTemplatePlaceholder: `Title template (optional, {{plan.title}} interpolates)`,
} as const;
