import { describe, expect, it } from 'vitest';
import {
  checkoutSearchTerms,
  groupCheckoutOptions,
  LOCAL_ONLY_GROUP_HEADING,
} from '../checkout-groups';
import type { ChatCheckoutOption } from '../../types';

/** The reported bug: three checkouts, two of them named `monorepo`. */
const CHECKOUTS: readonly ChatCheckoutOption[] = [
  {
    branch: 'main',
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: 'repo-a',
    label: 'monorepo',
    projectName: 'OpenThrottle',
    remoteUrl: 'git@github.com:openthrottle/monorepo.git',
  },
  {
    branch: 'trunk',
    filesystemPath: '/Users/matt/Work/monorepo',
    id: 'repo-b',
    label: 'monorepo',
    remoteUrl: 'git@github.com:shiftsmart/monorepo.git',
  },
  {
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

  it('keeps several checkouts of one owner together in input order', () => {
    const groups = groupCheckoutOptions([
      { id: 'b', label: 'beta', remoteUrl: 'git@github.com:acme/beta.git' },
      { id: 'a', label: 'alpha', remoteUrl: 'git@github.com:acme/alpha.git' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].options.map((option) => option.id)).toEqual(['b', 'a']);
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
    expect(checkoutSearchTerms({ id: 'x', label: 'bare' })).toEqual(['bare']);
  });
});
