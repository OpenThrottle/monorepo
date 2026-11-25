import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/projects.create';
import {
  CreateProjectDocument,
  ProjectCreateLinkRepositoryDocument,
} from '~/__generated__/graphql';
import {
  PROJECT_CREATE_COPY,
  PROJECT_FORM_COPY,
} from '~/routing/projects/data/copy';
import { buildRootMatch } from '~/testing/buildRootMatch';
import { renderRoutesStub } from '~/testing/route-fixtures';

import CreateProject, { action } from '../projects.create';

// Keep the real `parseFormData`; only stub the network call.
vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/projects.create',
    loaderData: { repositories: [] },
    params: {},
    pathname: '/projects/create',
  },
];

const runAction = async (formData: FormData) => {
  const request = new Request('http://localhost/projects/create', {
    body: formData,
    method: 'POST',
  });
  const result = await action({
    context: createTestRouterContext(),
    params: {},
    pattern: '/projects/create',
    request,
    url: new URL(request.url),
  });

  return { request, result };
};

describe('routes/projects.create.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('render', () => {
    test('renders the heading and the create form', () => {
      const component = renderRoutesStub(
        <CreateProject
          actionData={undefined}
          loaderData={{ repositories: [] }}
          matches={matches}
          params={{}}
        />,
      );

      expect(
        component.getByRole('heading', { name: PROJECT_CREATE_COPY.heading }),
      ).toBeInTheDocument();
      expect(component.getByTestId('ProjectForm')).toBeInTheDocument();
      expect(
        component.getByRole('button', {
          name: PROJECT_FORM_COPY.repositoriesPlaceholder,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('action', () => {
    test('returns an error and creates nothing when the name is blank', async () => {
      const formData = new FormData();
      formData.set('name', '   ');

      const { result } = await runAction(formData);

      expect(result).toEqual({ error: PROJECT_FORM_COPY.nameMissing });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
    });

    test('creates without links and redirects when no repository is chosen', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createProject: { id: 'proj-1' },
      });
      const formData = new FormData();
      formData.set('name', '  Launch  ');
      formData.set('description', '');

      const { request, result } = await runAction(formData);

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(1);
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        request,
        CreateProjectDocument,
        { input: { description: null, name: 'Launch' } },
      );
      if (!(result instanceof Response)) {
        throw new Error('expected a redirect Response');
      }
      expect(result.headers.get('location')).toBe('/projects/proj-1');
    });

    test('links every chosen repository after creating', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createProject: { id: 'proj-1' },
      });
      const formData = new FormData();
      formData.set('name', 'Launch');
      formData.append('repositoryIds', 'repo-1');
      formData.append('repositoryIds', 'repo-2');

      const { request, result } = await runAction(formData);

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        request,
        ProjectCreateLinkRepositoryDocument,
        { input: { projectId: 'proj-1', repositoryId: 'repo-1' } },
      );
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        request,
        ProjectCreateLinkRepositoryDocument,
        { input: { projectId: 'proj-1', repositoryId: 'repo-2' } },
      );
      expect(result).toBeInstanceOf(Response);
    });

    test('still redirects when a repository link fails', async () => {
      mockExecuteGraphqlWithAuth
        .mockResolvedValueOnce({ createProject: { id: 'proj-1' } })
        .mockRejectedValueOnce(new Error('link failed'));
      const formData = new FormData();
      formData.set('name', 'Launch');
      formData.append('repositoryIds', 'repo-1');

      const { result } = await runAction(formData);

      if (!(result instanceof Response)) {
        throw new Error('expected a redirect Response');
      }
      expect(result.headers.get('location')).toBe('/projects/proj-1');
    });

    test('returns the error when the create fails', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('boom'));
      const formData = new FormData();
      formData.set('name', 'Launch');

      const { result } = await runAction(formData);

      expect(result).toEqual({ error: 'boom' });
    });
  });
});
