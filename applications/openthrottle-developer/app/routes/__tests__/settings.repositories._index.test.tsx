import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { action, loader } from '../settings.repositories._index';
import type { Route } from '@/app/routes/+types/settings.repositories._index';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import {
  mockCheckout,
  mockDiscoveredWorktree,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';

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
  rootSource: 'DEFAULT',
  scannedAt: '2026-08-24T00:00:00.000Z',
  warnings: [],
  worktreeRoot: '/Users/dev/.openthrottle/worktrees/monorepo',
  worktrees: [],
};

const mockLoaderPayload = {
  discoveredFolders: [
    {
      alreadyRegistered: false,
      name: 'openthrottle',
      path: '/Users/dev/openthrottle',
    },
  ],
  discoveredWorktrees,
  workspacePickerCapabilities: {
    canUseNativeDialog: false,
    defaultBrowsePath: '/Users/dev',
    roots: ['/Users/dev'],
  },
  workspaceRepositories,
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
    test('returns nested rows, discovered folders, and picker capabilities', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      expect(result.discoveredFolders).toHaveLength(1);
      expect(result.pickerCapabilities.canUseNativeDialog).toBe(false);
      expect(result.pickerCapabilities.roots).toEqual(['/Users/dev']);
      expect(result.isUnpopulated).toBe(false);
      expect(result.rows.map((row) => row.id)).toEqual([
        'checkout-1',
        'checkout-2',
      ]);
      expect(result.rows[0].children).toHaveLength(1);
      expect(result.totalCount).toBe(2);
    });

    test('nests a worktree found on disk under its repository row', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        ...mockLoaderPayload,
        discoveredWorktrees: {
          ...discoveredWorktrees,
          worktrees: [
            mockDiscoveredWorktree({ name: 'wt-a', repositoryId: 'repo-1' }),
          ],
        },
      });

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      // Pagination still counts PARENT rows only, so the extra child does not
      // change the total.
      expect(result.totalCount).toBe(2);
      expect(
        result.rows[0].children?.map((child) => child.displayName),
      ).toEqual(['openthrottle-worktree', 'wt-a']);
      expect(result.discoveredWorktrees.worktrees).toHaveLength(1);
    });

    test('reports an unpopulated workspace when no repositories exist', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue({
        ...mockLoaderPayload,
        workspaceRepositories: [],
      });

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories'),
      );

      expect(result.isUnpopulated).toBe(true);
      expect(result.rows).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    test('filters by search and auto-expands a group matched only by a worktree', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const result = await loader(
        loaderArgs(
          'http://localhost/settings/repositories?search=openthrottle-worktree',
        ),
      );

      expect(result.rows.map((row) => row.id)).toEqual(['checkout-1']);
      expect(result.autoExpandedIds).toEqual(['checkout-1']);
      expect(result.isUnpopulated).toBe(false);
      expect(result.totalCount).toBe(1);
    });

    test('applies sortBy and sortOrder, falling back to the defaults', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const sorted = await loader(
        loaderArgs(
          'http://localhost/settings/repositories?sortBy=name&sortOrder=desc',
        ),
      );

      expect(sorted.rows.map((row) => row.repositoryName)).toEqual([
        'website',
        'OpenThrottle',
      ]);

      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const fallback = await loader(
        loaderArgs(
          'http://localhost/settings/repositories?sortBy=bogus&sortOrder=sideways',
        ),
      );

      expect(fallback.sortBy).toBe('name');
      expect(fallback.sortOrder).toBe('asc');
    });

    test('pages over parent rows, keeping a group whole', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories?limit=1&page=1'),
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe('checkout-1');
      expect(result.rows[0].children).toHaveLength(1);
      expect(result.totalCount).toBe(2);

      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const pageTwo = await loader(
        loaderArgs('http://localhost/settings/repositories?limit=1&page=2'),
      );

      expect(pageTwo.rows.map((row) => row.id)).toEqual(['checkout-2']);
    });

    test('clamps limit and page to sane values', async () => {
      mockExecuteGraphqlWithAuth.mockResolvedValue(mockLoaderPayload);

      const result = await loader(
        loaderArgs('http://localhost/settings/repositories?limit=9999&page=0'),
      );

      expect(result.limit).toBe(100);
      expect(result.page).toBe(1);
    });
  });

  describe('action', () => {
    const actionArgs = (formData: FormData): Route.ActionArgs => ({
      context: createTestRouterContext(),
      params: {},
      pattern: '/settings/repositories',
      request: new Request('http://localhost/settings/repositories', {
        body: formData,
        method: 'POST',
      }),
      url: new URL('http://localhost/settings/repositories'),
    });

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

    test('throws on unknown intent', async () => {
      const formData = new FormData();
      formData.set('intent', 'unknown');

      await expect(action(actionArgs(formData))).rejects.toThrow(
        'Invalid intent',
      );
    });
  });
});
