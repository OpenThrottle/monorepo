import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestActionsLinks } from './PullRequestActionsLinks';
import type { PullRequestActionsLinksProps } from './PullRequestActionsLinks';
import { githubRepoActionsForBranchUrl } from '~/routing/pull-requests/utils/github-pr-links';
import type { GetPullRequestDetailQuery } from '~/__generated__/graphql';

const pull: NonNullable<GetPullRequestDetailQuery['pull']> = {
  __typename: 'PullListItemObject',
  author: 'visormatt',
  baseRef: 'main',
  createdAt: '2026-08-01T00:00:00.000Z',
  headRef: 'feature/branch-name',
  headSha: 'abc1234',
  htmlUrl: 'https://github.com/OpenThrottle/monorepo/pull/42',
  mergedAt: null,
  number: 42,
  state: 'open',
  title: 'Add feature',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

describe('PullRequestActionsLinks Component', () => {
  let component: RenderResult;
  let props: PullRequestActionsLinksProps;

  beforeEach(() => {
    props = { owner: 'OpenThrottle', pull, repo: 'monorepo' };
    component = render(<PullRequestActionsLinks {...props} />);
  });

  test('renders a branch-name Actions link when headRef is present', () => {
    const link = component.getByRole('link', {
      name: 'Actions (branch name)',
    });

    expect(link).toHaveAttribute(
      'href',
      githubRepoActionsForBranchUrl(
        props.owner,
        props.repo,
        pull.headRef ?? '',
      ),
    );
  });

  test('renders the pull-request head/merge ref and repo-wide Actions links', () => {
    expect(
      component.getByRole('link', {
        name: `Actions (refs/pull/${pull.number}/head)`,
      }),
    ).toBeTruthy();
    expect(
      component.getByRole('link', {
        name: `Actions (refs/pull/${pull.number}/merge)`,
      }),
    ).toBeTruthy();
    expect(
      component.getByRole('link', { name: 'Actions (event:pull_request)' }),
    ).toBeTruthy();
    expect(
      component.getByRole('link', { name: 'All repo actions' }),
    ).toBeTruthy();
  });

  test('omits the branch-name Actions link when headRef is null', () => {
    component.unmount();
    component = render(
      <PullRequestActionsLinks {...props} pull={{ ...pull, headRef: null }} />,
    );

    expect(
      component.queryByRole('link', { name: 'Actions (branch name)' }),
    ).toBeNull();
  });
});
