import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestDetail } from '../PullRequestDetail';
import type { PullRequestDetailProps } from '../PullRequestDetail';
import type { GetPullRequestDetailQuery } from '~/__generated__/graphql';

const pull = (
  overrides: Partial<NonNullable<GetPullRequestDetailQuery['pull']>> = {},
): NonNullable<GetPullRequestDetailQuery['pull']> => ({
  __typename: 'PullListItemObject',
  author: 'visormatt',
  baseRef: 'main',
  createdAt: '2026-01-01T00:00:00.000Z',
  headRef: 'feature-branch',
  headSha: 'abc1234',
  htmlUrl: 'https://github.com/OpenThrottle/monorepo/pull/1',
  mergedAt: null,
  number: 1,
  state: 'open',
  title: 'Add feature',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('PullRequestDetail Component', () => {
  let component: RenderResult;
  let props: PullRequestDetailProps;

  beforeEach(() => {
    props = {
      listQuery: '',
      owner: 'OpenThrottle',
      pull: pull(),
      repo: 'monorepo',
    };
  });

  const renderDetail = (): RenderResult => {
    const Component = () => <PullRequestDetail {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders the pull request title and number', () => {
    component = renderDetail();

    expect(component.getByText('Add feature')).toBeInTheDocument();
    expect(component.getByText('#1')).toBeInTheDocument();
  });

  test('links back to the plain pull-requests list when listQuery is empty', () => {
    component = renderDetail();

    expect(
      component.getByRole('link', { name: 'Back to list' }),
    ).toHaveAttribute('href', '/pull-requests');
  });

  test('links back to the list with the preserved query string', () => {
    props = { ...props, listQuery: 'state=open&page=2' };
    component = renderDetail();

    expect(
      component.getByRole('link', { name: 'Back to list' }),
    ).toHaveAttribute('href', '/pull-requests?state=open&page=2');
  });

  test('renders the GitHub merge and CI card', () => {
    component = renderDetail();

    expect(component.getByText('Merge & CI on GitHub')).toBeInTheDocument();
  });
});
