import { describe, expect, test } from 'vitest';
import type { GetDashboardOnboardingQuery } from '~/__generated__/graphql';
import {
  deriveOnboardingCompletion,
  isOnboardingComplete,
  ONBOARDING_STEP_ID,
} from '../onboarding-steps';

const onboarding = (
  overrides: Partial<GetDashboardOnboardingQuery> = {},
): GetDashboardOnboardingQuery => ({
  discoverAgentClis: { totalCount: 0 },
  githubTokenConfigured: false,
  planCountsByStatus: [],
  workspaceLocalRepositories: [],
  ...overrides,
});

describe('deriveOnboardingCompletion', () => {
  test('an empty/first-run workspace has every step incomplete', () => {
    const completion = deriveOnboardingCompletion(onboarding());

    expect(completion).toStrictEqual({
      [ONBOARDING_STEP_ID.agentCli]: false,
      [ONBOARDING_STEP_ID.firstPlan]: false,
      [ONBOARDING_STEP_ID.firstRun]: false,
      [ONBOARDING_STEP_ID.githubToken]: false,
      [ONBOARDING_STEP_ID.workspaceRepo]: false,
    });
  });

  test('github token completes only when configured', () => {
    expect(
      deriveOnboardingCompletion(onboarding({ githubTokenConfigured: true }))[
        ONBOARDING_STEP_ID.githubToken
      ],
    ).toBe(true);
  });

  test('workspace repo completes with at least one local repository', () => {
    expect(
      deriveOnboardingCompletion(
        onboarding({ workspaceLocalRepositories: [{ id: 'repo-1' }] }),
      )[ONBOARDING_STEP_ID.workspaceRepo],
    ).toBe(true);
  });

  test('agent CLI completes when discovery reports at least one', () => {
    expect(
      deriveOnboardingCompletion(
        onboarding({ discoverAgentClis: { totalCount: 2 } }),
      )[ONBOARDING_STEP_ID.agentCli],
    ).toBe(true);
  });

  test('first plan completes when any status bucket has a plan', () => {
    const completion = deriveOnboardingCompletion(
      onboarding({
        planCountsByStatus: [{ count: 3, status: 'PENDING' }],
      }),
    );

    expect(completion[ONBOARDING_STEP_ID.firstPlan]).toBe(true);
    // A PENDING-only plan has not started a run.
    expect(completion[ONBOARDING_STEP_ID.firstRun]).toBe(false);
  });

  test('first run completes for queued/in-progress/completed plans', () => {
    for (const status of ['QUEUED', 'IN_PROGRESS', 'COMPLETED']) {
      expect(
        deriveOnboardingCompletion(
          onboarding({ planCountsByStatus: [{ count: 1, status }] }),
        )[ONBOARDING_STEP_ID.firstRun],
      ).toBe(true);
    }
  });

  test('run-started status comparison is case-insensitive', () => {
    expect(
      deriveOnboardingCompletion(
        onboarding({
          planCountsByStatus: [{ count: 1, status: 'in_progress' }],
        }),
      )[ONBOARDING_STEP_ID.firstRun],
    ).toBe(true);
  });

  test('totals sum across multiple status buckets', () => {
    const completion = deriveOnboardingCompletion(
      onboarding({
        planCountsByStatus: [
          { count: 0, status: 'PENDING' },
          { count: 0, status: 'IN_PROGRESS' },
        ],
      }),
    );

    expect(completion[ONBOARDING_STEP_ID.firstPlan]).toBe(false);
    expect(completion[ONBOARDING_STEP_ID.firstRun]).toBe(false);
  });
});

describe('isOnboardingComplete', () => {
  test('false while any step is incomplete', () => {
    expect(
      isOnboardingComplete(
        deriveOnboardingCompletion(onboarding({ githubTokenConfigured: true })),
      ),
    ).toBe(false);
  });

  test('true only when every step is complete', () => {
    const completion = deriveOnboardingCompletion(
      onboarding({
        discoverAgentClis: { totalCount: 1 },
        githubTokenConfigured: true,
        planCountsByStatus: [{ count: 1, status: 'COMPLETED' }],
        workspaceLocalRepositories: [{ id: 'repo-1' }],
      }),
    );

    expect(isOnboardingComplete(completion)).toBe(true);
  });
});
