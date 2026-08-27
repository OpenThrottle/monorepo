import { describe, expect, it } from 'vitest';
import { describeCheckouts } from '../checkout-labels';
import type { ChatCheckoutOption } from '../../types';

/**
 * The scenario that motivated the plan: two `monorepo` checkouts in different
 * orgs, a near-miss pair (`native-apps` vs `nativeapps`) that is NOT actually
 * ambiguous, and a local-only checkout with no remote at all.
 */
const REPORTED: readonly ChatCheckoutOption[] = [
  {
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: 'ot',
    label: 'monorepo',
    remoteUrl: 'git@github.com:openthrottle/monorepo.git',
  },
  {
    filesystemPath: '/Users/matt/Work/monorepo',
    id: 'ss',
    label: 'monorepo',
    remoteUrl: 'git@github.com:shiftsmart/monorepo.git',
  },
  {
    id: 'na',
    label: 'native-apps',
    remoteUrl: 'git@github.com:shiftsmart/native-apps.git',
  },
  {
    id: 'nna',
    label: 'nativeapps',
    remoteUrl: 'git@github.com:visormatt/nativeapps.git',
  },
  { filesystemPath: '/Users/matt/scratch/sandbox', id: 'sb', label: 'sandbox' },
];

const byId = (
  checkouts: readonly ChatCheckoutOption[],
  id: string,
): { label: string; qualifier?: string; triggerLabel: string } => {
  const found = describeCheckouts(checkouts).find(
    (descriptor) => descriptor.id === id,
  );
  if (found === undefined) throw new Error(`no descriptor for ${id}`);

  return found;
};

describe('describeCheckouts', () => {
  it('promotes the trigger to owner/name for the colliding monorepo pair', () => {
    expect(byId(REPORTED, 'ot').triggerLabel).toBe('openthrottle/monorepo');
    expect(byId(REPORTED, 'ss').triggerLabel).toBe('shiftsmart/monorepo');
  });

  it('leaves the trigger as the bare name when the name is already unique', () => {
    // native-apps and nativeapps look alike but are distinct strings, so
    // neither needs promoting.
    expect(byId(REPORTED, 'na').triggerLabel).toBe('native-apps');
    expect(byId(REPORTED, 'nna').triggerLabel).toBe('nativeapps');
    expect(byId(REPORTED, 'sb').triggerLabel).toBe('sandbox');
  });

  it('qualifies every row regardless of ambiguity, path-based when there is no remote', () => {
    expect(byId(REPORTED, 'na').qualifier).toBe('shiftsmart/native-apps');
    expect(byId(REPORTED, 'sb').qualifier).toBe('…/scratch/sandbox');
  });

  it('keeps the row label bare — the qualifier and heading carry the org', () => {
    expect(byId(REPORTED, 'ot').label).toBe('monorepo');
  });

  it('falls back to the path when owner/name is ALSO ambiguous', () => {
    // A worktree beside its primary: same name, same owner, same repo.
    const worktrees: readonly ChatCheckoutOption[] = [
      {
        filesystemPath: '/Users/matt/Development/openthrottle',
        id: 'primary',
        label: 'monorepo',
        remoteUrl: 'git@github.com:openthrottle/monorepo.git',
      },
      {
        filesystemPath: '/Users/matt/Development/openthrottle-worktrees/loop',
        id: 'worktree',
        label: 'monorepo',
        remoteUrl: 'git@github.com:openthrottle/monorepo.git',
      },
    ];

    expect(byId(worktrees, 'primary').triggerLabel).toBe(
      '…/Development/openthrottle',
    );
    expect(byId(worktrees, 'worktree').qualifier).toBe(
      '…/openthrottle-worktrees/loop',
    );
  });

  it('degrades to the bare name when everything is ambiguous', () => {
    const hopeless: readonly ChatCheckoutOption[] = [
      { id: 'a', label: 'monorepo' },
      { id: 'b', label: 'monorepo' },
    ];

    expect(describeCheckouts(hopeless)).toEqual([
      {
        id: 'a',
        label: 'monorepo',
        qualifier: undefined,
        triggerLabel: 'monorepo',
      },
      {
        id: 'b',
        label: 'monorepo',
        qualifier: undefined,
        triggerLabel: 'monorepo',
      },
    ]);
  });

  it('returns descriptors in input order', () => {
    expect(describeCheckouts(REPORTED).map((entry) => entry.id)).toEqual([
      'ot',
      'ss',
      'na',
      'nna',
      'sb',
    ]);
  });

  it('returns nothing for an empty list', () => {
    expect(describeCheckouts([])).toEqual([]);
  });
});
