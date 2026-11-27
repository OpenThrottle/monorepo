import { describe, expect, it } from 'vitest';

import type { ChatCheckoutOption } from '../../types';
import {
  checkoutSearchTerms,
  groupCheckoutOptions,
  LOCAL_ONLY_GROUP_HEADING,
} from '../checkout-groups';

/** The reported bug: three checkouts, two of them named `monorepo`. */
const CHECKOUTS: readonly [
  ChatCheckoutOption,
  ChatCheckoutOption,
  ChatCheckoutOption,
] = [
  {
    branch: 'main',
    defaultBranch: undefined,
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: 'repo-a',
    label: 'monorepo',
    projectName: 'OpenThrottle',
    remoteUrl: 'git@github.com:openthrottle/monorepo.git',
  },
  {
    branch: 'trunk',
    defaultBranch: undefined,
    filesystemPath: '/Users/matt/Work/monorepo',
    id: 'repo-b',
    label: 'monorepo',
    remoteUrl: 'git@github.com:shiftsmart/monorepo.git',
  },
  {
    defaultBranch: undefined,
    filesystemPath: '/Users/matt/scratch/sandbox',
    id: 'repo-c',
    label: 'sandbox',
  },
];

describe('groupCheckoutOptions', () => {
  it('groups by owner and pushes the remote-less checkouts to a trailing group', () => {
    expect(
      groupCheckoutOptions(CHECKOUTS).map((group) => [
        group.heading,
        group.options.map((option) => option.id),
      ]),
    ).toEqual([
      ['openthrottle', ['repo-a']],
      ['shiftsmart', ['repo-b']],
      [LOCAL_ONLY_GROUP_HEADING, ['repo-c']],
    ]);
  });

  it('qualifies headings with the host only when the list spans several hosts', () => {
    const selfHosted: ChatCheckoutOption = {
      defaultBranch: undefined,
      id: 'repo-d',
      label: 'monorepo',
      remoteUrl: 'git@git.internal.example:platform/monorepo.git',
    };

    expect(
      groupCheckoutOptions([...CHECKOUTS, selfHosted]).map(
        (group) => group.heading,
      ),
    ).toEqual([
      'git.internal.example/platform',
      'github.com/openthrottle',
      'github.com/shiftsmart',
      LOCAL_ONLY_GROUP_HEADING,
    ]);
  });

  it("orders one owner's repositories alphabetically, whatever the input order", () => {
    const groups = groupCheckoutOptions([
      {
        defaultBranch: undefined,
        id: 'b',
        label: 'beta',
        remoteUrl: 'git@github.com:acme/beta.git',
      },
      {
        defaultBranch: undefined,
        id: 'a',
        label: 'alpha',
        remoteUrl: 'git@github.com:acme/alpha.git',
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.options.map((option) => option.id)).toEqual(['a', 'b']);
  });

  it('puts the primary checkout first and nests its worktrees beneath it', () => {
    const remoteUrl = 'git@github.com:acme/monorepo.git';
    const groups = groupCheckoutOptions([
      {
        defaultBranch: undefined,
        id: 'wt-b',
        kind: 'worktree',
        label: 'plan-b',
        remoteUrl,
      },
      {
        defaultBranch: undefined,
        id: 'other',
        label: 'api',
        remoteUrl: 'git@github.com:acme/api.git',
      },
      {
        defaultBranch: undefined,
        id: 'wt-a',
        kind: 'worktree',
        label: 'plan-a',
        remoteUrl,
      },
      {
        defaultBranch: undefined,
        id: 'main',
        kind: 'primary',
        label: 'monorepo',
        remoteUrl,
      },
    ]);

    expect(groups[0]?.entries).toEqual([
      expect.objectContaining({
        checkout: expect.objectContaining({ id: 'other' }),
        nested: false,
      }),
      expect.objectContaining({
        checkout: expect.objectContaining({ id: 'main' }),
        nested: false,
      }),
      expect.objectContaining({
        checkout: expect.objectContaining({ id: 'wt-a' }),
        nested: true,
      }),
      expect.objectContaining({
        checkout: expect.objectContaining({ id: 'wt-b' }),
        nested: true,
      }),
    ]);
  });

  it('treats a checkout with no kind as primary', () => {
    const remoteUrl = 'git@github.com:acme/monorepo.git';
    const groups = groupCheckoutOptions([
      {
        defaultBranch: undefined,
        id: 'wt',
        kind: 'worktree',
        label: 'a-worktree',
        remoteUrl,
      },
      { defaultBranch: undefined, id: 'main', label: 'monorepo', remoteUrl },
    ]);

    expect(groups[0]?.options.map((option) => option.id)).toEqual([
      'main',
      'wt',
    ]);
  });

  it('leaves a worktree flush when its primary is not registered', () => {
    const groups = groupCheckoutOptions([
      {
        defaultBranch: undefined,
        id: 'wt',
        kind: 'worktree',
        label: 'plan-a',
        remoteUrl: 'git@github.com:acme/monorepo.git',
      },
    ]);

    expect(groups[0]?.entries[0]?.nested).toBe(false);
  });

  it('returns no groups for an empty list', () => {
    expect(groupCheckoutOptions([])).toEqual([]);
  });
});

describe('checkoutSearchTerms', () => {
  it('covers owner, host, name, branch, path and project — not just the label', () => {
    expect(checkoutSearchTerms(CHECKOUTS[0])).toEqual([
      'monorepo',
      'main',
      '/Users/matt/Development/openthrottle',
      'OpenThrottle',
      'github.com',
      'monorepo',
      'openthrottle',
    ]);
  });

  it('drops the fields a narrow discovery query never supplied', () => {
    expect(
      checkoutSearchTerms({ defaultBranch: undefined, id: 'x', label: 'bare' }),
    ).toEqual(['bare']);
  });
});
