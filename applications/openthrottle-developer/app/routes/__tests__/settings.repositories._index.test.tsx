import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/settings.repositories._index';
import {
  GetSettingsRepositoriesDiscoveryDocument,
  GetSettingsRepositoriesDocument,
  RescanSettingsWorktreesDocument,
} from '~/__generated__/graphql';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/testing/mock-repositories';

import { action, loader } from '../settings.repositories._index';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const workspaceRepositories = [
  mockRepository({
    checkouts: [
      mockCheckout({
        displayName: 'openthrottle',
        filesystemPath: '/Users/dev/openthrottle',
        id: 'checkout-1',
      }),
      mockCheckout({
        branch: 'loop-plan',
        displayName: 'openthrottle-worktree',
        id: 'worktree-1',
        kind: 'worktree',
      }),
    ],
    id: 'repo-1',
    name: 'OpenThrottle',
  }),
  mockRepository({
    checkouts: [mockCheckout({ displayName: 'website', id: 'checkout-2' })],
    id: 'repo-2',
    name: 'website',
  }),
];

const discoveredWorktrees = {
  droppedCount: 0,
  scannedAt: '2026-08-24T00:00:00.000Z',
  scannedRoots: [
    {
      baseRoot: '/Users/dev/.openthrottle/worktrees',
      exists: true,
      path: '/Users/dev/.openthrottle/worktrees/acme/monorepo',
      source: 'DEFAULT',
      worktreeCount: 0,
    },
  ],
  warnings: [],
  worktrees: [],
};

const fastPayload = {
  workspacePickerCapabilities: {
    canUseNativeDialog: false,
    defaultBrowsePath: '/Users/dev',
    roots: ['/Users/dev'],
  },
  workspaceRepositories,
};

const discoveryPayload = {
  discoveredFolders: [
    {
      alreadyRegistered: false,
      name: 'openthrottle',
      path: '/Users/dev/openthrottle',
    },
  ],
  discoveredWorktrees,
};

/** Answers each loader query by its document; anything else is a test bug. */
const mockQueries = (discovery: Promise<unknown>): void => {
  mockExecuteGraphqlWithAuth.mockImplementation((_request, document) => {
    if (document === GetSettingsRepositoriesDocument) {
      return Promise.resolve(fastPayload);
    }
    if (document === GetSettingsRepositoriesDiscoveryDocument) {
      return discovery;
    }
    throw new Error('unexpected query');
  });
};

const loaderArgs = (url: string): Route.LoaderArgs => {
  const request = new Request(url);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/settings/repositories',
    request,
    url: new URL(request.url),
  };
};

describe('routes/settings.repositories._index.tsx', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  describe('loader', () => {
    test('returns the registered repositories and picker capabilities', async () => {
      mockQueries(Promise.resolve(discoveryPayload));

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      expect(result.workspaceRepositories.map((repo) => repo.id)).toEqual([
        'repo-1',
        'repo-2',
      ]);
      expect(result.pickerCapabilities.roots).toEqual(['/Users/dev']);
    });

    test('streams the on-disk scans rather than waiting for them', async () => {
      // A scan that never settles must not hold the loader back.
      mockQueries(new Promise<never>(() => undefined));

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      expect(result.discovery).toBeInstanceOf(Promise);
      expect(result.workspaceRepositories).toHaveLength(2);
    });

    test('resolves the streamed promise to both scans', async () => {
      mockQueries(Promise.resolve(discoveryPayload));

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      await expect(result.discovery).resolves.toEqual(discoveryPayload);
    });

    test('passes a scan failure through to the page instead of failing the load', async () => {
      mockQueries(Promise.reject(new Error('git exploded')));

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      await expect(result.discovery).rejects.toThrow('git exploded');
    });

    test('issues the same two queries whatever the search params', async () => {
      mockQueries(Promise.resolve(discoveryPayload));

      await loader(
        loaderArgs(
          'http://localhost/settings/repositories?search=web&sortBy=name&page=2',
        ),
      );

      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(2);
    });
  });

  describe('action', () => {
    const actionArgs = (formData: FormData): Route.ActionArgs => {
      return {
        context: createTestRouterContext(),
        params: {},
        pattern: '/settings/repositories',
        request: new Request('http://localhost/settings/repositories', {
          body: formData,
          method: 'POST',
        }),
        url: new URL('http://localhost/settings/repositories'),
      };
    };

    test('addFolder returns error when path is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'addFolder');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Folder path is required.' });
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

    test('cloneRepo returns error when gitUrl is missing', async () => {
      const formData = new FormData();
      formData.set('intent', 'cloneRepo');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'Git repository URL is required.' });
      expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
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

    test('browseDirectory returns the enriched listing for the requested path', async () => {
      const listing = {
        entries: [
          {
            alreadyRegistered: false,
            isGitRepo: true,
            name: 'repo',
            path: '/Users/dev/repo',
          },
        ],
        isGitRepo: false,
        parentPath: null,
        path: '/Users/dev',
      };
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        browseDirectory: listing,
      });

      const formData = new FormData();
      formData.set('intent', 'browseDirectory');
      formData.set('path', '/Users/dev');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ browse: listing });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { path: '/Users/dev' },
      );
    });

    test('browseDirectory lists roots (null path) when no path is given', async () => {
      const listing = {
        entries: [],
        isGitRepo: false,
        parentPath: null,
        path: null,
      };
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        browseDirectory: listing,
      });

      const formData = new FormData();
      formData.set('intent', 'browseDirectory');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ browse: listing });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(Object),
        { path: null },
      );
    });

    test('pickFolderNative returns the chosen path', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        pickFolderNative: { path: '/Users/dev/picked' },
      });

      const formData = new FormData();
      formData.set('intent', 'pickFolderNative');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ picked: { path: '/Users/dev/picked' } });
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

    test('rescanWorktrees asks the server for a fresh scan', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        discoveredWorktrees: { scannedAt: '2026-11-08T00:00:00.000Z' },
      });

      const formData = new FormData();
      formData.set('intent', 'rescanWorktrees');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ rescannedAt: '2026-11-08T00:00:00.000Z' });
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        RescanSettingsWorktreesDocument,
      );
    });

    test('rescanWorktrees reports a failed scan as an error', async () => {
      mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('git exploded'));

      const formData = new FormData();
      formData.set('intent', 'rescanWorktrees');

      const result = await action(actionArgs(formData));

      expect(result).toEqual({ error: 'git exploded' });
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
