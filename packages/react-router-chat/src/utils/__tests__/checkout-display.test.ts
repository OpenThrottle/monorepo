import { describe, expect, it } from 'vitest';

import {
  shortenBranchName,
  shortenCheckoutPath,
  toCheckoutKind,
} from '../checkout-display';

describe('shortenBranchName', () => {
  it('leaves a branch that fits untouched', () => {
    expect(shortenBranchName('main', 20)).toBe('main');
  });

  it('keeps both the prefix and the distinguishing tail of a long branch', () => {
    const shortened = shortenBranchName(
      'feat/checkout-selector-primary-first-plan-0b6dfaf8',
      24,
    );

    expect(shortened).toHaveLength(24);
    expect(shortened.startsWith('feat/')).toBe(true);
    expect(shortened.endsWith('plan-0b6dfaf8')).toBe(true);
    expect(shortened).toContain('…');
  });
});

describe('shortenCheckoutPath', () => {
  it('collapses a macOS home directory to ~', () => {
    expect(
      shortenCheckoutPath('/Users/matt/Development/openthrottle/monorepo', 60),
    ).toBe('~/Development/openthrottle/monorepo');
  });

  it('collapses a Linux home directory to ~', () => {
    expect(shortenCheckoutPath('/home/dev/src/api', 60)).toBe('~/src/api');
  });

  it('keeps as many trailing segments as fit behind a marker', () => {
    expect(
      shortenCheckoutPath(
        '/Users/matt/.openthrottle/worktrees/OpenThrottle/monorepo/plan-c34e018b',
        40,
      ),
    ).toBe('…/OpenThrottle/monorepo/plan-c34e018b');
  });

  it('always keeps the last segment, even past the budget', () => {
    expect(shortenCheckoutPath('/srv/an-extremely-long-folder-name', 10)).toBe(
      '…/an-extremely-long-folder-name',
    );
  });

  it('leaves a path outside home alone when it fits', () => {
    expect(shortenCheckoutPath('/srv/monorepo', 40)).toBe('/srv/monorepo');
  });
});

describe('toCheckoutKind', () => {
  it('narrows the two known kinds', () => {
    expect(toCheckoutKind('primary')).toBe('primary');
    expect(toCheckoutKind('worktree')).toBe('worktree');
  });

  it('reads anything else as unknown', () => {
    expect(toCheckoutKind('bare')).toBeUndefined();
    expect(toCheckoutKind(null)).toBeUndefined();
  });
});
