import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import PullRequestDetail from '../pull-requests.$prId';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/pull-requests.$prId';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/pull-requests.$prId',
    loaderData: {
      listQuery: 'owner=OpenThrottle&repo=monorepo',
      owner: 'OpenThrottle',
      pull: null,
      repo: 'monorepo',
    },
    params: { prId: '999' },
    pathname: '/',
  },
];

describe('routes/pull-requests.$prId.tsx', () => {
  test('renders not found state when pull is missing', () => {
    render(
      <MemoryRouter>
        <PullRequestDetail
          actionData={undefined}
          loaderData={{
            listQuery: 'owner=OpenThrottle&repo=monorepo',
            owner: 'OpenThrottle',
            pull: null,
            repo: 'monorepo',
          }}
          matches={matches}
          params={{ prId: '999' }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('PullRequestNotFound')).toBeInTheDocument();
    expect(screen.getByText('Pull request not found')).toBeInTheDocument();
  });

  test('renders pull request title and number when found', () => {
    render(
      <MemoryRouter>
        <PullRequestDetail
          actionData={undefined}
          loaderData={{
            listQuery: 'owner=OpenThrottle&repo=monorepo',
            owner: 'OpenThrottle',
            pull: {
              author: 'visormatt',
              baseRef: 'main',
              createdAt: '2026-01-01T00:00:00.000Z',
              headRef: 'feature-branch',
              htmlUrl: 'https://github.com/OpenThrottle/monorepo/pull/42',
              mergedAt: null,
              number: 42,
              state: 'open',
              title: 'Fix queues',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
            repo: 'monorepo',
          }}
          matches={matches}
          params={{ prId: '42' }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /fix queues/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('visormatt')).toBeInTheDocument();
  });
});
