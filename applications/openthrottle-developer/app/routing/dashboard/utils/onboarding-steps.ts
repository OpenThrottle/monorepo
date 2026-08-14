import type { GetDashboardOnboardingQuery } from '~/__generated__/graphql';

/**
 * @description Stable identifiers for the dashboard "Get Started" checklist
 * steps. Used as the join key between step metadata/copy (data.ts) and the
 * derived completion map produced from real loader state.
 */
export const ONBOARDING_STEP_ID = {
  agentCli: 'agentCli',
  firstPlan: 'firstPlan',
  firstRun: 'firstRun',
  githubToken: 'githubToken',
  workspaceRepo: 'workspaceRepo',
} as const;

export type OnboardingStepId =
  (typeof ONBOARDING_STEP_ID)[keyof typeof ONBOARDING_STEP_ID];

/**
 * @description Plan statuses that imply the user has kicked off at least one
 * run. There is no cheap global "plan runs" count, so we treat a plan that has
 * left the authoring states — queued to run, actively running, or finished —
 * as the real-state proxy for "ran your first task".
 */
export const RUN_STARTED_PLAN_STATUSES: readonly string[] = [
  'COMPLETED',
  'IN_PROGRESS',
  'QUEUED',
];

export type OnboardingCompletion = Record<OnboardingStepId, boolean>;

/**
 * @description Total number of plans across every status bucket returned by
 * `planCountsByStatus`.
 */
const totalPlanCount = (
  counts: GetDashboardOnboardingQuery['planCountsByStatus'],
): number => counts.reduce((sum, entry) => sum + entry.count, 0);

/**
 * @description Number of plans whose status implies a run was started (see
 * RUN_STARTED_PLAN_STATUSES). Status comparison is case-insensitive.
 */
const runStartedPlanCount = (
  counts: GetDashboardOnboardingQuery['planCountsByStatus'],
): number =>
  counts.reduce(
    (sum, entry) =>
      RUN_STARTED_PLAN_STATUSES.includes(entry.status.toUpperCase())
        ? sum + entry.count
        : sum,
    0,
  );

/**
 * @description Derive per-step completion for the Get Started checklist from
 * the dashboard onboarding query result. Pure: no I/O, no side effects — the
 * single source of truth for what "done" means for each step, so the card and
 * its tests agree. All completion is derived from real server state, never from
 * a "clicked the button" flag.
 */
export const deriveOnboardingCompletion = (
  data: GetDashboardOnboardingQuery,
): OnboardingCompletion => {
  return {
    [ONBOARDING_STEP_ID.agentCli]: data.discoverAgentClis.totalCount > 0,
    [ONBOARDING_STEP_ID.firstPlan]: totalPlanCount(data.planCountsByStatus) > 0,
    [ONBOARDING_STEP_ID.firstRun]:
      runStartedPlanCount(data.planCountsByStatus) > 0,
    [ONBOARDING_STEP_ID.githubToken]: data.githubTokenConfigured,
    [ONBOARDING_STEP_ID.workspaceRepo]:
      data.workspaceLocalRepositories.length > 0,
  };
};

/**
 * @description True when every checklist step is complete. Drives the card's
 * auto-hide-on-complete behavior (independent of the manual dismiss atom).
 */
export const isOnboardingComplete = (
  completion: OnboardingCompletion,
): boolean => Object.values(completion).every(Boolean);
