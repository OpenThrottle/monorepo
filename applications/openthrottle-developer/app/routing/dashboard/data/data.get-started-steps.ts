import {
  ONBOARDING_STEP_ID,
  type OnboardingStepId,
} from '~/routing/dashboard/utils/onboarding-steps';

/**
 * Static metadata for one Get Started checklist step: its stable id (the join
 * key to derived completion + copy) and the deep-link destination its CTA opens.
 * Copy (title/description/cta) lives in `GET_STARTED_STEP_COPY`, keyed by id.
 */
export interface GetStartedStepMeta {
  readonly href: string;
  readonly id: OnboardingStepId;
}

/**
 * The Get Started checklist steps in display order. Each row pairs a step id
 * with the route its CTA deep-links to. Completion for each is derived from real
 * loader state (see `deriveOnboardingCompletion`), not from following the link.
 */
export const GET_STARTED_STEPS: readonly GetStartedStepMeta[] = [
  { href: '/settings/agents', id: ONBOARDING_STEP_ID.agentCli },
  { href: '/settings/repositories', id: ONBOARDING_STEP_ID.workspaceRepo },
  { href: '/plans', id: ONBOARDING_STEP_ID.firstPlan },
  { href: '/plans', id: ONBOARDING_STEP_ID.firstRun },
  { href: '/settings', id: ONBOARDING_STEP_ID.githubToken },
];
