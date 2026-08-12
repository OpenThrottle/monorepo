import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../settings.workspace.repositories.$repositoryId._index';
import type { Route } from '@/app/routes/+types/settings.workspace.repositories.$repositoryId._index';

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

describe('routes/settings.workspace.repositories.$repositoryId._index.tsx', () => {
  test('renders the repository detail for the loaded repository', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ repository }}
          matches={stubMatches()}
          params={{ repositoryId: repository.id }}
        />
      </MemoryRouter>,
    );

    expect(view.getByTestId('WorkspaceRepositoryDetail')).toBeInTheDocument();
    expect(view.getByText(repository.name)).toBeInTheDocument();
    expect(
      view.getAllByText('https://github.com/acme/openthrottle'),
    ).toHaveLength(2);
  });

  test('links the edit button to the repository edit route', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ repository }}
          matches={stubMatches()}
          params={{ repositoryId: repository.id }}
        />
      </MemoryRouter>,
    );

    expect(view.getByRole('link', { name: /edit/i })).toHaveAttribute(
      'href',
      `/settings/workspace/repositories/${repository.id}/edit`,
    );
  });
});
