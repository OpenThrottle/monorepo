import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/settings.repositories.$repositoryId._index';

import Component from '../settings.repositories.$repositoryId._index';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const repository: Route.ComponentProps['loaderData']['repository'] = {
  checkouts: [],
  createdAt: '2026-07-24T00:00:00.000Z',
  defaultBranch: 'main',
  id: 'repo-1',
  name: 'openthrottle',
  normalizedRemoteUrl: 'https://github.com/acme/openthrottle',
  project: null,
  projectId: null,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

// The detail's trust card submits through a fetcher, which needs a data router.
const renderDetail = () => {
  const Detail = () => {
    return (
      <Component
        actionData={undefined}
        loaderData={{ repository }}
        matches={stubMatches()}
        params={{ repositoryId: repository.id }}
      />
    );
  };
  const RoutesStub = createRoutesStub([{ Component: Detail, path: '/' }]);

  return render(<RoutesStub />);
};

describe('routes/settings.repositories.$repositoryId._index.tsx', () => {
  test('renders the repository detail for the loaded repository', () => {
    const view = renderDetail();

    expect(view.getByTestId('RepositoryDetail')).toBeInTheDocument();
    expect(view.getByText(repository.name)).toBeInTheDocument();
    expect(
      view.getAllByText('https://github.com/acme/openthrottle'),
    ).toHaveLength(2);
  });

  test('links the edit button to the repository edit route', () => {
    const view = renderDetail();

    expect(view.getByRole('link', { name: /edit/i })).toHaveAttribute(
      'href',
      `/settings/repositories/${repository.id}/edit`,
    );
  });
});
