import { describe, expect, test } from 'vitest';
import { resolvePlanWorkingDirectory } from '../resolve-plan-working-directory';

const REPOSITORIES = [
  {
    checkouts: [{ filesystemPath: '/abs/one', id: 'checkout-1' }],
    id: 'repo-1',
  },
  {
    checkouts: [{ filesystemPath: '/abs/two', id: 'checkout-2' }],
    id: 'repo-2',
  },
];

describe('resolvePlanWorkingDirectory', () => {
  test('prefers the run-config working directory', () => {
    expect(
      resolvePlanWorkingDirectory({
        checkoutId: 'checkout-1',
        repositories: REPOSITORIES,
        repositoryId: 'repo-1',
        workingDirectory: '/abs/explicit',
      }),
    ).toBe('/abs/explicit');
  });

  test('falls back to the selected checkout path', () => {
    expect(
      resolvePlanWorkingDirectory({
        checkoutId: 'checkout-2',
        repositories: REPOSITORIES,
        repositoryId: 'repo-2',
        workingDirectory: '',
      }),
    ).toBe('/abs/two');
  });

  test('never guesses a checkout when none is selected', () => {
    expect(
      resolvePlanWorkingDirectory({
        checkoutId: '',
        repositories: REPOSITORIES,
        repositoryId: '',
        workingDirectory: '',
      }),
    ).toBe('');
  });

  test('returns empty when the selected checkout is not in the repositories', () => {
    expect(
      resolvePlanWorkingDirectory({
        checkoutId: 'checkout-9',
        repositories: REPOSITORIES,
        repositoryId: '',
        workingDirectory: '',
      }),
    ).toBe('');
  });
});
