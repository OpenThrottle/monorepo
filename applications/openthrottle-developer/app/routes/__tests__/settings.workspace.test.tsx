import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { action, loader } from '../settings.workspace';
import type { Route } from '@/app/routes/+types/settings.workspace';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const mockProfile = {
  contactDisplayName: 'Matt',
  contactEmail: 'matt@example.com',
  createdAt: '2026-05-18T12:00:00.000Z',
  enabledEditors: [WorkspaceEditorId.Cursor],
  updatedAt: '2026-05-18T12:00:00.000Z',
  userId: '11111111-1111-4111-8111-111111111111',
};

const mockLoaderPayload = {
  discoveredFolders: [
    {
      alreadyRegistered: false,
      name: 'openthrottle',
      path: '/Users/dev/openthrottle',
    },
  ],
  projects: [{ id: 'proj-1', name: 'openthrottle-developer' }],
  workspaceRepositories: [
    {
      checkouts: [],
      createdAt: '2026-05-18T12:00:00.000Z',
      defaultBranch: 'main',
      id: 'repo-1',
      name: 'OpenThrottle',
      normalizedRemoteUrl: 'https://github.com/openthrottle/monorepo',
      project: null,
      projectId: null,
      updatedAt: '2026-05-18T12:00:00.000Z',
    },
  ],
  workspaceSettings: {
    profile: mockProfile,
  },
};

describe('routes/settings.workspace.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns profile, repositories, and projects from workspaceSettings query', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const request = new Request('http://localhost/settings/workspace');
      const args: Route.LoaderArgs = {
        context: createTestRouterContext(),
        params: {},
        pattern: '/settings/workspace',
        request,
        url: new URL(request.url),
      };

      const result = await loader(args);

      expect(result.profile).toEqual(mockProfile);
      expect(result.discoveredFolders).toHaveLength(1);
      expect(result.repositories).toHaveLength(1);
      expect(result.projects).toEqual(mockLoaderPayload.projects);
    });
  });

  describe('action', () => {
    const actionArgs = (formData: FormData): Route.ActionArgs => ({
      context: createTestRouterContext(),
      params: {},
      pattern: '/settings/workspace',
      request: new Request('http://localhost/settings/workspace', {
        body: formData,
        method: 'POST',
      }),
      url: new URL('http://localhost/settings/workspace'),
    });

    test('updateProfile calls updateWorkspaceProfile mutation', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        updateWorkspaceProfile: mockProfile,
      });

      const formData = new FormData();
      formData.set('intent', 'updateProfile');
      formData.set('contactDisplayName', 'Matthew');
      formData.set('contactEmail', 'matthew@example.com');
      formData.append('enabledEditors', WorkspaceEditorId.Vscode);

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ ok: true });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        {
          input: {
            contactDisplayName: 'Matthew',
            contactEmail: 'matthew@example.com',
            enabledEditors: [WorkspaceEditorId.Vscode],
          },
        },
      );
    });

    test('addFolder returns error when path is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'addFolder');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'A folder path is required.' });
    });

    test('addFolder calls addWorkspaceFolder and returns the payload', async () => {
      const payload = {
        checkout: { id: 'checkout-1' },
        project: null,
        projectCreated: false,
        reconciliation: 'matched_remote',
        repository: { id: 'repo-1' },
      };
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        addWorkspaceFolder: payload,
      });

      const formData = new FormData();
      formData.set('intent', 'addFolder');
      formData.set('path', '/Users/dev/openthrottle');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ addedFolder: payload });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        {
          input: { displayName: null, path: '/Users/dev/openthrottle' },
        },
      );
    });

    test('refreshCheckout returns drift for the checkout', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        refreshCheckout: {
          checkout: { id: 'checkout-1' },
          drift: {
            branchMoved: false,
            pathMissing: true,
            remoteChanged: false,
          },
          merged: false,
          repository: { id: 'repo-1' },
          supersededProjectId: null,
        },
      });

      const formData = new FormData();
      formData.set('intent', 'refreshCheckout');
      formData.set('id', 'checkout-1');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({
        refreshed: {
          checkoutId: 'checkout-1',
          drift: {
            branchMoved: false,
            pathMissing: true,
            remoteChanged: false,
          },
          merged: false,
        },
      });
    });

    test('browseDirectory returns entries for the requested path', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        browseDirectory: [{ name: 'repo', path: '/Users/dev/repo' }],
      });

      const formData = new FormData();
      formData.set('intent', 'browseDirectory');
      formData.set('path', '/Users/dev');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({
        browse: {
          entries: [{ name: 'repo', path: '/Users/dev/repo' }],
          path: '/Users/dev',
        },
      });
    });

    test('applyEditorConfig calls applyWorkspaceEditorConfiguration mutation', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        applyWorkspaceEditorConfiguration: {
          applications: [
            {
              editor: WorkspaceEditorId.Cursor,
              filesWritten: ['.cursor/mcp.json'],
              filesystemPath: '/Users/dev/openthrottle',
              repositoryId: 'repo-1',
              warnings: [],
            },
          ],
        },
      });

      const formData = new FormData();
      formData.set('intent', 'applyEditorConfig');

      const result = await action(actionArgs(formData));

      expect(result).toMatchObject({
        message: expect.stringContaining('1 editor/repo pairing'),
      });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { input: {} },
      );
    });

    test('deleteRepo calls deleteWorkspaceLocalRepository mutation', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        deleteWorkspaceLocalRepository: true,
      });

      const formData = new FormData();
      formData.set('intent', 'deleteRepo');
      formData.set('id', 'repo-1');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ ok: true });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { id: 'repo-1' },
      );
    });

    test('throws on unknown intent', async () => {
      const formData = new FormData();
      formData.set('intent', 'unknown');

      await expect(action(actionArgs(formData))).rejects.toThrow(
        'Invalid intent',
      );
    });
  });
});
