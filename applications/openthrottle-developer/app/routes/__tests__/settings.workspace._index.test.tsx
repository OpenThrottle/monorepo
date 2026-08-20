import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { WorkspaceEditorId } from '~/__generated__/graphql';
import { action, loader } from '../settings.workspace._index';
import type { Route } from '@/app/routes/+types/settings.workspace._index';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

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

const mockLocalRepositories = [
  {
    displayName: 'monorepo',
    filesystemPath: '/Users/dev/openthrottle',
    id: 'repo-1',
  },
];

describe('routes/settings.workspace._index.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns the profile, repositories, and derived apply targets', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        workspaceSettings: {
          localRepositories: mockLocalRepositories,
          profile: mockProfile,
        },
      });

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
      expect(result.localRepositories).toEqual(mockLocalRepositories);
      expect(result.targets).toEqual([
        {
          displayName: 'monorepo',
          editor: WorkspaceEditorId.Cursor,
          editorLabel: 'Cursor',
          filesystemPath: '/Users/dev/openthrottle',
          id: 'repo-1',
        },
      ]);
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
        applications: [
          expect.objectContaining({ filesWritten: ['.cursor/mcp.json'] }),
        ],
        message: expect.stringContaining('1 editor/repo pairing'),
      });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { input: {} },
      );
    });

    test('applyEditorConfig scopes the mutation to a single repositoryId', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        applyWorkspaceEditorConfiguration: { applications: [] },
      });

      const formData = new FormData();
      formData.set('intent', 'applyEditorConfig');
      formData.set('repositoryId', 'repo-1');

      await action(actionArgs(formData));

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { input: { repositoryIds: ['repo-1'] } },
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
