import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import PullRequestsIndex from '../pull-requests._index';
import { renderRoutesStub } from '~/testing/route-fixtures';

const mockLoaderData = {
  filters: {
    author: '',
    authorExact: false,
    base: '',
    merged: undefined,
    owner: 'OpenThrottle',
    repo: 'monorepo',
    state: 'open' as const,
  },
  listQuery: 'owner=OpenThrottle&repo=monorepo',
  prPreviewNumber: null,
  prPreviewPull: null,
  pulls: [],
};

describe('routes/pull-requests._index.tsx', () => {
  test('renders pull requests introduction and toolbar', () => {
    renderRoutesStub(
      <PullRequestsIndex
        actionData={undefined}
        loaderData={mockLoaderData}
        matches={[] as never}
        params={{}}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Pull requests' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });
});
