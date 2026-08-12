import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestGithubCard } from './PullRequestGithubCard';
import type { PullRequestGithubCardProps } from './PullRequestGithubCard';

const mockPull: PullRequestGithubCardProps['pull'] = {
  __typename: 'PullListItemObject',
  author: 'visormatt',
  baseRef: 'main',
  createdAt: '2026-01-01T00:00:00.000Z',
  headRef: 'feature-branch',
  headSha: 'abc123',
  htmlUrl: 'https://github.com/openthrottle/monorepo/pull/42',
  mergedAt: null,
  number: 42,
  state: 'open',
  title: 'Add a feature',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('PullRequestGithubCard Component', () => {
  let component: RenderResult;
  let props: PullRequestGithubCardProps;

  beforeEach(() => {
    props = {
      owner: 'openthrottle',
      pull: mockPull,
      repo: 'monorepo',
    };

    const Component = () => <PullRequestGithubCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the merge and CI heading', () => {
    expect(
      component.getByRole('heading', { name: /merge & ci on github/i }),
    ).toBeInTheDocument();
  });

  test('renders links to the GitHub checks tab', () => {
    const link = component.getByRole('link', {
      name: /checks tab \(ci rollup\)/i,
    });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('openthrottle/monorepo/pull/42'),
    );
  });

  test('renders the pull request number in the merge-ref guidance', () => {
    expect(
      component.getByText('refs/pull/42/merge', { selector: 'span' }),
    ).toBeInTheDocument();
  });
});
