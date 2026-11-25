import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/projects.$projectId.edit';
import {
  ProjectEditDeleteProjectDocument,
  UpdateProjectDocument,
} from '~/__generated__/graphql';
import { PROJECT_DELETE_COPY } from '~/routing/projects/data/copy';
import { buildRootMatch } from '~/testing/buildRootMatch';
import { renderRoutesStub } from '~/testing/route-fixtures';

import EditProject, { action, loader } from '../projects.$projectId.edit';

// Keep the real `parseFormData`; only stub the network call.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const mockProject = {
  __typename: 'ProjectObject' as const,
  description: 'Existing description',
  id: 'proj-1',
  name: 'Existing Project',
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
      const component = renderRoutesStub(
        <EditProject
          actionData={undefined}
          loaderData={{ project: mockProject }}
          matches={matches}
          params={{ projectId: 'proj-1' }}
        />,
      );

      expect(
        component.getByDisplayValue('Existing Project'),
      ).toBeInTheDocument();
      expect(
        component.getByDisplayValue('Existing description'),
      ).toBeInTheDocument();
      expect(
        component.getByRole('heading', { name: 'Edit Existing Project' }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('button', { name: 'Save changes' }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('button', { name: PROJECT_DELETE_COPY.trigger }),
      ).toBeInTheDocument();
      expect(component.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
        'href',
        '/projects/proj-1',
      );
    });

    test('renders ProjectNotFound when project is missing', () => {
      const component = renderRoutesStub(
        <EditProject
          actionData={undefined}
          loaderData={{ project: null }}
          matches={matches}
          params={{ projectId: 'proj-1' }}
        />,
      );

      expect(component.getByText('Project not found')).toBeInTheDocument();
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
          },
        },
      );

      if (!(result instanceof Response)) {
        throw new Error('expected the action to return a redirect Response');
      }

      expect(result.status).toBe(302);
      expect(result.headers.get('location')).toBe('/projects/proj-1');
    });

    test('deletes the project and returns to the list on the delete intent', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({ deleteProject: true });

      const formData = new FormData();
      formData.set('intent', 'deleteProject');

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
        ProjectEditDeleteProjectDocument,
        { input: { id: 'proj-1' } },
      );
      if (!(result instanceof Response)) {
        throw new Error('expected the action to return a redirect Response');
      }
      expect(result.headers.get('location')).toBe('/projects');
    });

    test('returns the error when the delete fails', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('denied'));

      const formData = new FormData();
      formData.set('intent', 'deleteProject');

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

      expect(result).toEqual({ error: 'denied' });
    });
  });
});
