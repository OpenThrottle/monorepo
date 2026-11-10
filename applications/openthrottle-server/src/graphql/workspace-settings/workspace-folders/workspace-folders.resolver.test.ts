/**
 * @description Unit tests for the cache side of the workspace-folder mutations: each one that
 * registers, clones or re-links a checkout drops the caller's cached worktree discovery after the
 * service call, so /settings/repositories reflects it on the next load instead of after the TTL.
 */

import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import type { WorktreeActivityService } from '../../../services/worktree-activity/worktree-activity.service.ts';
import type { WorkspaceSettingsLoaders } from '../loaders/loaders.service.ts';
import type {
  AddWorkspaceFolderPayloadObject,
  RefreshCheckoutPayloadObject,
} from '../workspace-folders.object.ts';
import { WorkspaceFoldersResolver } from './workspace-folders.resolver.ts';
import type { WorkspaceFoldersService } from './workspace-folders.service.ts';

const USER = 'user-1';

const build = (
  service: Partial<WorkspaceFoldersService>,
): {
  readonly invalidate: ReturnType<typeof vi.fn>;
  readonly resolver: WorkspaceFoldersResolver;
} => {
  const invalidate = vi.fn();
  const resolver = new WorkspaceFoldersResolver(
    createMock<WorktreeActivityService>({ invalidate }),
    createMock<WorkspaceSettingsLoaders>(),
    createMock<WorkspaceFoldersService>(service),
  );
  return { invalidate, resolver };
};

describe('WorkspaceFoldersResolver', () => {
  describe('addWorkspaceFolder', () => {
    it('returns the payload and drops the cached discovery', async () => {
      const payload = createMock<AddWorkspaceFolderPayloadObject>();
      const { invalidate, resolver } = build({
        addWorkspaceFolder: vi.fn().mockResolvedValue(payload),
      });

      await expect(
        resolver.addWorkspaceFolder(USER, { path: '/repo' }),
      ).resolves.toBe(payload);
      expect(invalidate).toHaveBeenCalledWith(USER);
    });
  });

  describe('cloneRepository', () => {
    it('returns the payload and drops the cached discovery', async () => {
      const payload = createMock<AddWorkspaceFolderPayloadObject>();
      const { invalidate, resolver } = build({
        cloneRepository: vi.fn().mockResolvedValue(payload),
      });

      await expect(
        resolver.cloneRepository(USER, {
          gitUrl: 'https://github.com/OpenThrottle/monorepo.git',
        }),
      ).resolves.toBe(payload);
      expect(invalidate).toHaveBeenCalledWith(USER);
    });
  });

  describe('refreshCheckout', () => {
    it('returns the payload and drops the cached discovery', async () => {
      const payload = createMock<RefreshCheckoutPayloadObject>();
      const { invalidate, resolver } = build({
        refreshCheckout: vi.fn().mockResolvedValue(payload),
      });

      await expect(
        resolver.refreshCheckout(USER, { id: 'checkout-1' }),
      ).resolves.toBe(payload);
      expect(invalidate).toHaveBeenCalledWith(USER);
    });
  });

  it('keeps the cache when the mutation fails', async () => {
    const { invalidate, resolver } = build({
      addWorkspaceFolder: vi.fn().mockRejectedValue(new Error('not a folder')),
    });

    await expect(
      resolver.addWorkspaceFolder(USER, { path: '/nope' }),
    ).rejects.toThrow('not a folder');
    expect(invalidate).not.toHaveBeenCalled();
  });
});
