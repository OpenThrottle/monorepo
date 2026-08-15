import * as React from 'react';
import { describe, expect, test } from 'vitest';
import Component from '../settings.repositories.$repositoryId.edit';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const mockRepository: WorkspaceRepositoryFieldsFragment = {
  __typename: 'RepositoryObject',
  checkouts: [],
  createdAt: '2026-07-24T00:00:00.000Z',
  defaultBranch: 'main',
  id: 'repo-1',
  name: 'monorepo',
  normalizedRemoteUrl: 'github.com/openthrottle/monorepo',
  projectId: null,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

describe('routes/settings.repositories.$repositoryId.edit.tsx', () => {
  test('renders the repository edit form', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ projects: [], repository: mockRepository }}
        matches={stubMatches()}
        params={{ repositoryId: 'repo-1' }}
      />,
    );

    expect(view.getByTestId('RepositoryEditForm')).toBeInTheDocument();
    expect(view.getByDisplayValue('monorepo')).toBeInTheDocument();
  });

  test('surfaces the action error when present', () => {
    const view = renderRoutesStub(
      <Component
        actionData={{ error: 'Failed to update repository.' }}
        loaderData={{ projects: [], repository: mockRepository }}
        matches={stubMatches()}
        params={{ repositoryId: 'repo-1' }}
      />,
    );

    expect(view.getByText('Failed to update repository.')).toBeInTheDocument();
  });
});
