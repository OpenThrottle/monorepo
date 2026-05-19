import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { action, loader } from '../settings.workspace';
import type { Route } from '@/app/routes/+types/settings.workspace';

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
  projects: [{ id: 'proj-1', name: 'openthrottle-developer' }],
  workspaceSettings: {
    localRepositories: [
      {
        createdAt: '2026-05-18T12:00:00.000Z',
        displayName: 'OpenThrottle',
        filesystemPath: '/Users/dev/openthrottle',
        gitDefaultBranch: null,
        gitRemoteUrl: null,
        id: 'repo-1',
        project: null,
        projectId: null,
        updatedAt: '2026-05-18T12:00:00.000Z',
        userId: mockProfile.userId,
      },
    ],
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
      const args = {
        context: {},
        params: {},
        request,
        unstable_pattern: '/settings/workspace',
      } as Route.LoaderArgs;

      const result = await loader(args);

      expect(result.profile).toEqual(mockProfile);
      expect(result.localRepositories).toHaveLength(1);
      expect(result.projects).toEqual(mockLoaderPayload.projects);
    });
  });

  describe('action', () => {
    const actionArgs = (formData: FormData): Route.ActionArgs => ({
      context: {},
      params: {},
      request: new Request('http://localhost/settings/workspace', {
        body: formData,
        method: 'POST',
      }),
      unstable_pattern: '/settings/workspace',
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

    test('createRepo returns error when path is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'createRepo');
      formData.set('displayName', 'My repo');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Absolute path is required.' });
    });

    test('createRepo calls createWorkspaceLocalRepository mutation', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        createWorkspaceLocalRepository: { id: 'new-repo' },
      });

      const formData = new FormData();
      formData.set('intent', 'createRepo');
      formData.set('displayName', 'OpenThrottle');
      formData.set('filesystemPath', '/Users/dev/openthrottle');
      formData.set('projectId', 'proj-1');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ ok: true });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        {
          input: {
            displayName: 'OpenThrottle',
            filesystemPath: '/Users/dev/openthrottle',
            projectId: 'proj-1',
          },
        },
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
