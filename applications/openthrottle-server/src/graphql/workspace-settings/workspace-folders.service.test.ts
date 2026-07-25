import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Repository,
  RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectsService,
  RepositoriesService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { RepositoryInspectionService } from '../repository-inspection/repository-inspection.service';
import {
  WorkspaceFoldersService,
  WORKSPACE_ROOTS_ENV,
} from './workspace-folders.service';

const execFileAsync = promisify(execFile);

describe('WorkspaceFoldersService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const mockCheckoutsService = createMock<RepositoryCheckoutsService>({
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    listByUserId: vi.fn(),
    saveInspection: vi.fn(),
    updateFilesystemPath: vi.fn(),
  });
  const mockProjectsService = createMock<ProjectsService>({
    findById: vi.fn(),
  });
  const mockRepositoriesService = createMock<RepositoriesService>({
    create: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findByNormalizedRemoteUrl: vi.fn(),
  });

  const inspectionService = new RepositoryInspectionService(
    createMock<LoggerService>(),
    mockCheckoutsService,
  );

  const service = new WorkspaceFoldersService(
    createMock<LoggerService>(),
    mockCheckoutsService,
    inspectionService,
    mockProjectsService,
    mockRepositoriesService,
  );

  let workspaceRoot: string;
  let gitRepoDir: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'ot-folders-'));

    gitRepoDir = join(workspaceRoot, 'fixture-repo');
    await mkdir(gitRepoDir, { recursive: true });
    await execFileAsync('git', ['-C', gitRepoDir, 'init', '--quiet']);
    await execFileAsync('git', [
      '-C',
      gitRepoDir,
      'remote',
      'add',
      'origin',
      'https://GitHub.com/OpenThrottle/Fixture.git',
    ]);

    await mkdir(join(workspaceRoot, 'not-a-repo'), { recursive: true });
  }, 30_000);

  afterAll(async () => {
    await rm(workspaceRoot, { force: true, recursive: true });
  });

  beforeEach(() => {
    process.env[WORKSPACE_ROOTS_ENV] = workspaceRoot;
    vi.mocked(mockCheckoutsService.create).mockReset();
    vi.mocked(mockCheckoutsService.listByUserId).mockResolvedValue([]);
    vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(null);
    vi.mocked(mockCheckoutsService.saveInspection).mockReset();
    vi.mocked(mockRepositoriesService.create).mockReset();
    vi.mocked(mockRepositoriesService.delete).mockReset();
    vi.mocked(mockRepositoriesService.findById).mockReset();
    vi.mocked(
      mockRepositoriesService.findByNormalizedRemoteUrl,
    ).mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env[WORKSPACE_ROOTS_ENV];
  });

  describe('discoveredFolders', () => {
    it('returns git folders one level under the roots, skipping non-repos', async () => {
      const discovered = await service.discoveredFolders(userId);

      expect(discovered).toEqual([
        {
          alreadyRegistered: false,
          name: 'fixture-repo',
          path: gitRepoDir,
        },
      ]);
    });

    it('marks path-registered folders', async () => {
      vi.mocked(mockCheckoutsService.listByUserId).mockResolvedValue([
        asMock<RepositoryCheckout>({
          filesystemPath: gitRepoDir,
          id: 'checkout-1',
        }),
      ]);

      const discovered = await service.discoveredFolders(userId);

      expect(discovered[0]?.alreadyRegistered).toBe(true);
    });

    it('returns empty when no roots are configured', async () => {
      delete process.env[WORKSPACE_ROOTS_ENV];

      await expect(service.discoveredFolders(userId)).resolves.toEqual([]);
    });
  });

  describe('browseDirectory', () => {
    it('lists immediate subdirectories inside the roots', async () => {
      const entries = await service.browseDirectory(workspaceRoot);

      expect(entries.map((entry) => entry.name)).toEqual([
        'fixture-repo',
        'not-a-repo',
      ]);
    });

    it('rejects paths outside the configured roots', async () => {
      await expect(service.browseDirectory(tmpdir())).rejects.toThrow(
        'not within the configured workspace roots',
      );
    });

    it('rejects relative paths', async () => {
      await expect(service.browseDirectory('relative')).rejects.toThrow(
        'absolute path',
      );
    });

    it('rejects when roots are unset', async () => {
      delete process.env[WORKSPACE_ROOTS_ENV];

      await expect(service.browseDirectory(workspaceRoot)).rejects.toThrow(
        WORKSPACE_ROOTS_ENV,
      );
    });
  });

  describe('addWorkspaceFolder', () => {
    it('creates a canonical repository and checkout with detected metadata', async () => {
      const repository = asMock<Repository>({
        id: 'repo-1',
        name: 'Fixture',
        normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
        projectId: null,
      });
      vi.mocked(mockRepositoriesService.create).mockResolvedValue(repository);
      vi.mocked(mockCheckoutsService.create).mockResolvedValue(
        asMock<RepositoryCheckout>({
          displayName: 'fixture-repo',
          filesystemPath: gitRepoDir,
          id: 'checkout-1',
          kind: 'primary',
          managed: false,
          repositoryId: 'repo-1',
          userId,
        }),
      );

      const payload = await service.addWorkspaceFolder(userId, {
        path: gitRepoDir,
      });

      expect(payload.reconciliation).toBe('created_canonical');
      expect(mockRepositoriesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fixture',
          normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
        }),
      );
      expect(payload.checkout.inspection?.git.normalizedRemoteUrl).toBe(
        'https://github.com/OpenThrottle/Fixture',
      );
      expect(mockCheckoutsService.saveInspection).toHaveBeenCalledWith(
        'checkout-1',
        expect.objectContaining({ scannedAt: expect.any(String) }),
        expect.any(Date),
      );
    });

    it('attaches to an existing canonical repository by normalized remote', async () => {
      const canonical = asMock<Repository>({
        id: 'repo-existing',
        name: 'Fixture',
        normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
        projectId: null,
      });
      vi.mocked(
        mockRepositoriesService.findByNormalizedRemoteUrl,
      ).mockResolvedValue(canonical);
      vi.mocked(mockCheckoutsService.create).mockResolvedValue(
        asMock<RepositoryCheckout>({
          id: 'checkout-2',
          repositoryId: 'repo-existing',
        }),
      );

      const payload = await service.addWorkspaceFolder(userId, {
        path: gitRepoDir,
      });

      expect(payload.reconciliation).toBe('matched_remote');
      expect(mockRepositoriesService.create).not.toHaveBeenCalled();
    });

    it('rejects invalid paths before any registration', async () => {
      await expect(
        service.addWorkspaceFolder(userId, { path: 'relative/path' }),
      ).rejects.toThrow('absolute path');
      expect(mockCheckoutsService.create).not.toHaveBeenCalled();
    });

    it('cleans up a newly created repository when checkout creation fails', async () => {
      const repository = asMock<Repository>({
        id: 'repo-orphan',
        normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
        projectId: null,
      });
      vi.mocked(mockRepositoriesService.create).mockResolvedValue(repository);
      vi.mocked(mockCheckoutsService.create).mockRejectedValue(
        new Error('duplicate'),
      );

      await expect(
        service.addWorkspaceFolder(userId, { path: gitRepoDir }),
      ).rejects.toThrow('duplicate');
      expect(mockRepositoriesService.delete).toHaveBeenCalledWith(
        'repo-orphan',
      );
    });
  });

  describe('refreshCheckout', () => {
    it('throws NotFoundException for an unowned checkout', async () => {
      await expect(service.refreshCheckout(userId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('surfaces pathMissing drift when the folder is gone', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        asMock<RepositoryCheckout>({
          filesystemPath: join(workspaceRoot, 'deleted-checkout'),
          id: 'checkout-gone',
          inspection: null,
          scannedAt: null,
        }),
      );

      const payload = await service.refreshCheckout(userId, 'checkout-gone');

      expect(payload.drift.pathMissing).toBe(true);
      expect(payload.drift.remoteChanged).toBe(false);
      expect(mockCheckoutsService.saveInspection).not.toHaveBeenCalled();
    });

    it('surfaces branch/remote drift against the previous snapshot', async () => {
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        asMock<RepositoryCheckout>({
          filesystemPath: gitRepoDir,
          id: 'checkout-drift',
          inspection: {
            agentConfig: {},
            git: {
              currentBranch: 'feature/old',
              normalizedRemoteUrl: 'https://github.com/other/repo',
            },
            scannedAt: '2026-07-01T00:00:00.000Z',
            stack: {},
            warnings: [],
          },
          scannedAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      );

      const payload = await service.refreshCheckout(userId, 'checkout-drift');

      expect(payload.drift.pathMissing).toBe(false);
      expect(payload.drift.remoteChanged).toBe(true);
      expect(mockCheckoutsService.saveInspection).toHaveBeenCalled();
    });
  });
});
