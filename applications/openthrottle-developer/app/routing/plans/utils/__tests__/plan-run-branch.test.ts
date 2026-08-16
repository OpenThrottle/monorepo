import { describe, expect, test } from 'vitest';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  FALLBACK_RUN_BRANCH,
  resolveDefaultRunBranch,
} from '../plan-run-branch';

const buildRepository = (
  overrides: Partial<PlanRunConfigRepositoryFieldsFragment> = {},
): PlanRunConfigRepositoryFieldsFragment => ({
  checkouts: [],
  defaultBranch: null,
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: null,
  projectId: null,
  ...overrides,
});

const buildCheckout = (
  currentBranch: string | null,
  gitDefaultBranch: string | null = null,
): PlanRunConfigRepositoryFieldsFragment['checkouts'][number] => ({
  displayName: 'monorepo',
  filesystemPath: '/Users/me/monorepo',
  id: 'checkout-1',
  inspection: {
    git: { currentBranch, defaultBranch: gitDefaultBranch },
  },
  kind: 'PRIMARY',
  managed: false,
});

describe('resolveDefaultRunBranch', () => {
  test('falls back to main when nothing is selected', () => {
    expect(
      resolveDefaultRunBranch({
        checkoutId: '',
        repositories: [],
        repositoryId: '',
      }),
    ).toBe(FALLBACK_RUN_BRANCH);
  });

  test('prefers the selected checkout current branch', () => {
    const repositories = [
      buildRepository({
        checkouts: [buildCheckout('feature/x')],
        defaultBranch: 'trunk',
      }),
    ];

    expect(
      resolveDefaultRunBranch({
        checkoutId: 'checkout-1',
        repositories,
        repositoryId: '',
      }),
    ).toBe('feature/x');
  });

  test('falls back to the repository default branch for a detached checkout', () => {
    const repositories = [
      buildRepository({
        checkouts: [buildCheckout(null, 'develop')],
        defaultBranch: 'trunk',
      }),
    ];

    expect(
      resolveDefaultRunBranch({
        checkoutId: 'checkout-1',
        repositories,
        repositoryId: '',
      }),
    ).toBe('trunk');
  });

  test('falls back to the git-reported default branch when the repository has none', () => {
    const repositories = [
      buildRepository({ checkouts: [buildCheckout(null, 'develop')] }),
    ];

    expect(
      resolveDefaultRunBranch({
        checkoutId: 'checkout-1',
        repositories,
        repositoryId: '',
      }),
    ).toBe('develop');
  });

  test('uses the repository default branch when a repository is selected', () => {
    const repositories = [buildRepository({ defaultBranch: 'trunk' })];

    expect(
      resolveDefaultRunBranch({
        checkoutId: '',
        repositories,
        repositoryId: 'repo-1',
      }),
    ).toBe('trunk');
  });

  test('uses the single checkout branch when the repository has no default branch', () => {
    const repositories = [
      buildRepository({ checkouts: [buildCheckout('feature/x')] }),
    ];

    expect(
      resolveDefaultRunBranch({
        checkoutId: '',
        repositories,
        repositoryId: 'repo-1',
      }),
    ).toBe('feature/x');
  });

  test('falls back to main for an unknown selection', () => {
    expect(
      resolveDefaultRunBranch({
        checkoutId: 'missing',
        repositories: [buildRepository()],
        repositoryId: '',
      }),
    ).toBe(FALLBACK_RUN_BRANCH);
  });
});
