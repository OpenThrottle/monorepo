import * as React from 'react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import EditProject, { action, loader } from '../projects.$projectId.edit';
import { UpdateProjectDocument } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/projects.$projectId.edit';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const mockProject = {
  __typename: 'ProjectObject' as const,
  description: 'Existing description',
  id: 'proj-1',
  name: 'Existing Project',
  nxProjectName: 'openthrottle-developer',
  updatedAt: '2025-01-02T00:00:00Z',
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/projects.$projectId.edit',
    loaderData: { project: mockProject },
    params: { projectId: 'proj-1' },
    pathname: '/projects/proj-1/edit',
  },
];

describe('routes/projects.$projectId.edit.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('render', () => {
    test('renders the form with loaded default values', () => {
      renderRoutesStub(
        <EditProject
          actionData={undefined}
          loaderData={{ project: mockProject }}
          matches={matches}
          params={{ projectId: 'proj-1' }}
        />,
      );

      expect(screen.getByDisplayValue('Existing Project')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Existing description'),
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('openthrottle-developer'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Save changes' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
        'href',
        '/projects/proj-1',
      );
    });

    test('renders ProjectNotFound when project is missing', () => {
      renderRoutesStub(
        <EditProject
          actionData={undefined}
          loaderData={{ project: null }}
          matches={matches}
          params={{ projectId: 'proj-1' }}
        />,
      );

      expect(screen.getByText('Project not found')).toBeInTheDocument();
    });
  });

  describe('loader', () => {
    test('loads the project by id', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({ project: mockProject });

      const result = await loader({
        context: createTestRouterContext(),
        params: { projectId: 'proj-1' },
        pattern: '/projects/:projectId/edit',
        request: new Request('http://localhost/projects/proj-1/edit'),
        url: new URL('http://localhost/projects/proj-1/edit'),
      });

      expect(result).toEqual({ project: mockProject });
    });
  });

  describe('action', () => {
    test('returns an error when the name is empty', async () => {
      const formData = new FormData();
      formData.set('name', '   ');

      const request = new Request('http://localhost/projects/proj-1/edit', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: { projectId: 'proj-1' },
        pattern: '/projects/:projectId/edit',
        request,
        url: new URL(request.url),
      });

      expect(result).toEqual({ error: 'Project name is required.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('builds UpdateProjectInput and redirects on success', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        updateProject: { id: 'proj-1' },
      });

      const formData = new FormData();
      formData.set('name', '  Renamed Project  ');
      formData.set('description', '  New description  ');
      formData.set('nxProjectName', '');

      const request = new Request('http://localhost/projects/proj-1/edit', {
        body: formData,
        method: 'POST',
      });

      const result = await action({
        context: createTestRouterContext(),
        params: { projectId: 'proj-1' },
        pattern: '/projects/:projectId/edit',
        request,
        url: new URL(request.url),
      });

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        request,
        UpdateProjectDocument,
        {
          input: {
            description: 'New description',
            id: 'proj-1',
            name: 'Renamed Project',
            nxProjectName: null,
          },
        },
      );

      if (!(result instanceof Response)) {
        throw new Error('expected the action to return a redirect Response');
      }

      expect(result.status).toBe(302);
      expect(result.headers.get('location')).toBe('/projects/proj-1');
    });
  });
});
