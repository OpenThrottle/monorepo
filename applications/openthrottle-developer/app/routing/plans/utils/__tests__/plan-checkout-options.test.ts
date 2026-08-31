import { describe, expect, test } from 'vitest';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { toPlanCheckoutOptions } from '../plan-checkout-options';

type Checkout = PlanRunConfigRepositoryFieldsFragment['checkouts'][number];

const buildCheckout = (overrides: Partial<Checkout> = {}): Checkout => ({
  displayName: 'monorepo',
  filesystemPath: '/Users/me/monorepo',
  id: 'checkout-1',
  inspection: { git: { currentBranch: 'main', defaultBranch: 'main' } },
  kind: 'PRIMARY',
  managed: false,
  ...overrides,
});

const buildRepository = (
  overrides: Partial<PlanRunConfigRepositoryFieldsFragment> = {},
): PlanRunConfigRepositoryFieldsFragment => ({
  checkouts: [buildCheckout()],
  defaultBranch: null,
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'github.com/OpenThrottle/monorepo',
  projectId: null,
  ...overrides,
});

describe('toPlanCheckoutOptions', () => {
  test('returns nothing for an empty registry', () => {
    expect(toPlanCheckoutOptions([])).toEqual([]);
  });

  test('contributes nothing for a repository with no checkouts', () => {
    expect(toPlanCheckoutOptions([buildRepository({ checkouts: [] })])).toEqual(
      [],
    );
  });

  test('flattens every checkout across repositories, keyed by checkout id', () => {
    const options = toPlanCheckoutOptions([
      buildRepository({
        checkouts: [
          buildCheckout({ id: 'checkout-1' }),
          buildCheckout({ id: 'checkout-2' }),
        ],
      }),
      buildRepository({
        checkouts: [buildCheckout({ id: 'checkout-3' })],
        id: 'repo-2',
      }),
    ]);

    expect(options.map((option) => option.id)).toEqual([
      'checkout-1',
      'checkout-2',
      'checkout-3',
    ]);
  });

  test('carries the identity fields the picker groups and disambiguates on', () => {
    const [option] = toPlanCheckoutOptions([
      buildRepository({
        checkouts: [
          buildCheckout({
            displayName: 'monorepo (worktree)',
            filesystemPath: '/Users/me/worktrees/monorepo',
            inspection: {
              git: { currentBranch: 'feature/x', defaultBranch: 'main' },
            },
          }),
        ],
        normalizedRemoteUrl: 'github.com/OpenThrottle/monorepo',
      }),
    ]);

    expect(option).toEqual({
      branch: 'feature/x',
      filesystemPath: '/Users/me/worktrees/monorepo',
      id: 'checkout-1',
      label: 'monorepo (worktree)',
      remoteUrl: 'github.com/OpenThrottle/monorepo',
    });
  });

  test('falls back to the repository default branch for a detached checkout', () => {
    const [option] = toPlanCheckoutOptions([
      buildRepository({
        checkouts: [
          buildCheckout({
            inspection: {
              git: { currentBranch: null, defaultBranch: 'develop' },
            },
          }),
        ],
        defaultBranch: 'trunk',
      }),
    ]);

    expect(option?.branch).toBe('trunk');
  });

  test('falls back to the git-reported default branch when the repository has none', () => {
    const [option] = toPlanCheckoutOptions([
      buildRepository({
        checkouts: [
          buildCheckout({
            inspection: {
              git: { currentBranch: '', defaultBranch: 'develop' },
            },
          }),
        ],
      }),
    ]);

    expect(option?.branch).toBe('develop');
  });

  test('leaves the branch unset when nothing reports one', () => {
    const [option] = toPlanCheckoutOptions([
      buildRepository({
        checkouts: [buildCheckout({ inspection: null })],
      }),
    ]);

    expect(option?.branch).toBeUndefined();
  });

  test('labels an unnamed checkout with its folder name', () => {
    const [option] = toPlanCheckoutOptions([
      buildRepository({
        checkouts: [
          buildCheckout({
            displayName: '',
            filesystemPath: '/Users/me/code/openthrottle/',
          }),
        ],
      }),
    ]);

    expect(option?.label).toBe('openthrottle');
  });

  test('leaves the remote unset when the repository has none', () => {
    const [option] = toPlanCheckoutOptions([
      buildRepository({ normalizedRemoteUrl: null }),
    ]);

    expect(option?.remoteUrl).toBeUndefined();
  });
});
