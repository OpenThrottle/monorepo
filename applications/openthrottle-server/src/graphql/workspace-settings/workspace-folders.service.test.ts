import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Project,
  Repository,
  RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import type {
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

import type { ForeignSkillMaterializationService } from '../../services/foreign-skill-injection/foreign-skill-materialization.service.ts';
import { RepositoryInspectionService } from '../repository-inspection/repository-inspection.service.ts';
import { NATIVE_PICKER_ENV } from './native-folder-picker.ts';
import {
  WorkspaceFolderError,
  WorkspaceFolderErrorCode,
} from './workspace-folders.errors.ts';
import {
  CHECKOUT_ROOT_ENV,
  getCheckoutRoot,
  repositoryNameFromGitUrl,
  repositoryNameFromRemote,
  WORKSPACE_ROOTS_ENV,
  WorkspaceFoldersService,
} from './workspace-folders.service.ts';

const execFileAsync = promisify(execFile);

describe('WorkspaceFoldersService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const mockCheckoutsService = createMock<RepositoryCheckoutsService>({
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    findByRepositoryIdForUser: vi.fn(),
    listByUserId: vi.fn(),
    saveInspection: vi.fn(),
    updateFilesystemPath: vi.fn(),
  });
  const mockProjectsService = createMock<ProjectsService>({
    create: vi.fn(),
    findById: vi.fn(),
  });
  const mockRepositoriesService = createMock<RepositoriesService>({
    create: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findByNormalizedRemoteUrl: vi.fn(),
    mergeDetectedRemote: vi.fn(),
    update: vi.fn(),
  });

  const inspectionService = new RepositoryInspectionService(
    createMock<LoggerService>(),
    mockCheckoutsService,
  );

  const mockForeignSkillMaterialization =
    createMock<ForeignSkillMaterializationService>({
      applyForRepository: vi.fn(),
    });

  const service = new WorkspaceFoldersService(
    createMock<LoggerService>(),
    mockCheckoutsService,
    inspectionService,
    mockProjectsService,
    mockRepositoriesService,
    mockForeignSkillMaterialization,
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
    vi.mocked(mockCheckoutsService.findByRepositoryIdForUser).mockResolvedValue(
      [],
    );
    vi.mocked(mockCheckoutsService.saveInspection).mockReset();
    vi.mocked(
      mockCheckoutsService.setForeignSkillInjectionEnabledForRepository,
    ).mockReset();
    vi.mocked(mockForeignSkillMaterialization.applyForRepository).mockReset();
    vi.mocked(mockProjectsService.create).mockReset();
    vi.mocked(mockProjectsService.create).mockResolvedValue(
      asMock<Project>({ id: 'auto-project', name: 'Fixture' }),
    );
    vi.mocked(mockRepositoriesService.create).mockReset();
    vi.mocked(mockRepositoriesService.delete).mockReset();
    vi.mocked(mockRepositoriesService.findById).mockReset();
    vi.mocked(mockRepositoriesService.mergeDetectedRemote).mockReset();
    vi.mocked(mockRepositoriesService.update).mockReset();
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

  describe('workspacePickerCapabilities', () => {
    it('exposes configured roots (host view) and seeds the default from the first root', () => {
      const capabilities = service.workspacePickerCapabilities('127.0.0.1');

      expect(capabilities.roots).toEqual([workspaceRoot]);
      expect(capabilities.defaultBrowsePath).toBe(workspaceRoot);
    });

    it('falls back to the host home directory when no roots are configured', () => {
      delete process.env[WORKSPACE_ROOTS_ENV];

      const capabilities = service.workspacePickerCapabilities('127.0.0.1');

      expect(capabilities.roots).toEqual([]);
      expect(capabilities.defaultBrowsePath).toBe(homedir());
    });

    it('reports canUseNativeDialog false for a non-loopback or unknown peer', () => {
      expect(
        service.workspacePickerCapabilities('10.0.0.4').canUseNativeDialog,
      ).toBe(false);
      expect(service.workspacePickerCapabilities(null).canUseNativeDialog).toBe(
        false,
      );
    });

    it('honours the native-picker env override even for a remote peer', () => {
      process.env[NATIVE_PICKER_ENV] = '1';
      try {
        expect(
          service.workspacePickerCapabilities('10.0.0.4').canUseNativeDialog,
        ).toBe(true);
      } finally {
        delete process.env[NATIVE_PICKER_ENV];
      }
    });
  });

  describe('pickFolderNative', () => {
    it('rejects before spawning when the request is not same-machine', async () => {
      const run = vi.fn();

      await expect(
        service.pickFolderNative('10.0.0.4', run),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(run).not.toHaveBeenCalled();
    });

    it('returns the chosen path when available and a folder is picked', async () => {
      process.env[NATIVE_PICKER_ENV] = '1';
      try {
        const payload = await service.pickFolderNative(
          '10.0.0.4',
          async () => `${workspaceRoot}/`,
        );

        expect(payload.path).toBe(realpathSync(workspaceRoot));
      } finally {
        delete process.env[NATIVE_PICKER_ENV];
      }
    });

    it('returns a null path (no error) on user-cancel', async () => {
      process.env[NATIVE_PICKER_ENV] = '1';
      try {
        const payload = await service.pickFolderNative('10.0.0.4', async () => {
          throw Object.assign(new Error('User canceled.'), {
            code: 1,
            stdout: '',
          });
        });

        expect(payload.path).toBeNull();
      } finally {
        delete process.env[NATIVE_PICKER_ENV];
      }
    });

    it('rejects when the dialog times out', async () => {
      process.env[NATIVE_PICKER_ENV] = '1';
      try {
        await expect(
          service.pickFolderNative('10.0.0.4', async () => {
            throw Object.assign(new Error('timed out'), {
              killed: true,
              signal: 'SIGTERM',
            });
          }),
        ).rejects.toThrow('timed out');
      } finally {
        delete process.env[NATIVE_PICKER_ENV];
      }
    });
  });

  describe('browseDirectory', () => {
    it('lists immediate subdirectories annotated with isGitRepo', async () => {
      const listing = await service.browseDirectory(userId, workspaceRoot);

      expect(listing.entries.map((entry) => entry.name)).toEqual([
        'fixture-repo',
        'not-a-repo',
      ]);
      const gitEntry = listing.entries.find((e) => e.name === 'fixture-repo');
      const plainEntry = listing.entries.find((e) => e.name === 'not-a-repo');
      expect(gitEntry?.isGitRepo).toBe(true);
      expect(plainEntry?.isGitRepo).toBe(false);
      expect(gitEntry?.alreadyRegistered).toBe(false);
    });

    it('marks an entry alreadyRegistered when a checkout matches its path', async () => {
      vi.mocked(mockCheckoutsService.listByUserId).mockResolvedValue([
        asMock<RepositoryCheckout>({
          filesystemPath: join(realpathSync(workspaceRoot), 'fixture-repo'),
          id: 'checkout-1',
        }),
      ]);

      const listing = await service.browseDirectory(userId, workspaceRoot);

      expect(
        listing.entries.find((e) => e.name === 'fixture-repo')
          ?.alreadyRegistered,
      ).toBe(true);
    });

    it('lists the configured roots as entries when no path is given', async () => {
      const listing = await service.browseDirectory(userId);

      expect(listing.path).toBeNull();
      expect(listing.parentPath).toBeNull();
      expect(listing.isGitRepo).toBe(false);
      expect(listing.entries).toHaveLength(1);
      expect(listing.entries[0]?.path).toBe(realpathSync(workspaceRoot));
    });

    it('exposes current path + git-repo flag and a parent under a root', async () => {
      const listing = await service.browseDirectory(userId, gitRepoDir);

      expect(listing.path).toBe(realpathSync(gitRepoDir));
      expect(listing.isGitRepo).toBe(true);
      expect(listing.parentPath).toBe(realpathSync(workspaceRoot));
    });

    it('clamps parentPath to null at the root boundary', async () => {
      const listing = await service.browseDirectory(userId, workspaceRoot);

      expect(listing.path).toBe(realpathSync(workspaceRoot));
      expect(listing.parentPath).toBeNull();
    });

    describe('user-facing failures', () => {
      const expectCode = async (
        promise: Promise<unknown>,
        code: WorkspaceFolderErrorCode,
      ): Promise<WorkspaceFolderError> => {
        const error = await promise.catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(WorkspaceFolderError);
        if (!(error instanceof WorkspaceFolderError)) {
          throw new Error('expected a WorkspaceFolderError');
        }
        expect(error.code).toBe(code);
        expect(error.extensions.code).toBe(code);
        return error;
      };

      it('rejects paths outside the configured roots', async () => {
        const error = await expectCode(
          service.browseDirectory(userId, tmpdir()),
          WorkspaceFolderErrorCode.WORKSPACE_PATH_OUTSIDE_ROOTS,
        );
        expect(error.message).toContain(
          'not within the configured workspace roots',
        );
      });

      it('rejects relative paths', async () => {
        const error = await expectCode(
          service.browseDirectory(userId, 'relative'),
          WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_ABSOLUTE,
        );
        expect(error.message).toContain('absolute path');
      });

      it('rejects a path that does not exist', async () => {
        await expectCode(
          service.browseDirectory(userId, join(workspaceRoot, 'nope')),
          WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_FOUND,
        );
      });

      it('rejects with a stable code naming the env var when roots are unset', async () => {
        delete process.env[WORKSPACE_ROOTS_ENV];

        const error = await expectCode(
          service.browseDirectory(userId, workspaceRoot),
          WorkspaceFolderErrorCode.WORKSPACE_ROOTS_NOT_CONFIGURED,
        );
        expect(error.message).toContain(WORKSPACE_ROOTS_ENV);
      });

      it('rejects the roots listing with the same code when roots are unset', async () => {
        delete process.env[WORKSPACE_ROOTS_ENV];

        await expectCode(
          service.browseDirectory(userId),
          WorkspaceFolderErrorCode.WORKSPACE_ROOTS_NOT_CONFIGURED,
        );
      });

      it.skipIf(process.getuid?.() === 0)(
        'rejects an unreadable directory (EACCES) as not readable',
        async () => {
          const locked = join(workspaceRoot, 'locked-dir');
          await mkdir(locked, { recursive: true });
          await chmod(locked, 0o000);
          try {
            await expectCode(
              service.browseDirectory(userId, locked),
              WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_READABLE,
            );
          } finally {
            await chmod(locked, 0o755);
            await rm(locked, { force: true, recursive: true });
          }
        },
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
          name: 'OpenThrottle/Fixture',
          normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
        }),
      );
      expect(payload.projectCreated).toBe(true);
      expect(payload.project?.id).toBe('auto-project');
      expect(mockProjectsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fixture',
          nxProjectName: 'Fixture',
        }),
      );
      expect(mockRepositoriesService.update).toHaveBeenCalledWith('repo-1', {
        projectId: 'auto-project',
      });
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
      expect(payload.projectCreated).toBe(false);
      expect(mockRepositoriesService.create).not.toHaveBeenCalled();
      expect(mockProjectsService.create).not.toHaveBeenCalled();
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
          repository: asMock<Repository>({
            id: 'repo-1',
            normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
          }),
          scannedAt: null,
        }),
      );

      const payload = await service.refreshCheckout(userId, 'checkout-gone');

      expect(payload.drift.pathMissing).toBe(true);
      expect(payload.drift.remoteChanged).toBe(false);
      expect(payload.merged).toBe(false);
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
          repository: asMock<Repository>({
            id: 'repo-1',
            normalizedRemoteUrl: 'https://github.com/other/repo',
          }),
          scannedAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      );

      const payload = await service.refreshCheckout(userId, 'checkout-drift');

      expect(payload.drift.pathMissing).toBe(false);
      expect(payload.drift.remoteChanged).toBe(true);
      expect(payload.merged).toBe(false);
      expect(mockCheckoutsService.saveInspection).toHaveBeenCalled();
      expect(
        mockRepositoriesService.mergeDetectedRemote,
      ).not.toHaveBeenCalled();
    });

    it('merges a provisional repository that gained a remote into the canonical row', async () => {
      const provisional = asMock<Repository>({
        id: 'prov-repo',
        normalizedRemoteUrl: null,
        projectId: 'prov-project',
      });
      const canonical = asMock<Repository>({
        id: 'canon-repo',
        name: 'Fixture',
        normalizedRemoteUrl: 'https://github.com/OpenThrottle/Fixture',
        projectId: 'canon-project',
      });
      vi.mocked(mockCheckoutsService.findByIdForUser).mockResolvedValue(
        asMock<RepositoryCheckout>({
          filesystemPath: gitRepoDir,
          id: 'checkout-merge',
          inspection: null,
          repository: provisional,
          repositoryId: 'prov-repo',
          scannedAt: null,
        }),
      );
      vi.mocked(mockRepositoriesService.mergeDetectedRemote).mockResolvedValue({
        merged: true,
        repository: canonical,
        supersededProjectId: 'prov-project',
      });

      const payload = await service.refreshCheckout(userId, 'checkout-merge');

      expect(mockRepositoriesService.mergeDetectedRemote).toHaveBeenCalledWith(
        'prov-repo',
        'https://github.com/OpenThrottle/Fixture',
      );
      expect(payload.merged).toBe(true);
      expect(payload.repository.id).toBe('canon-repo');
      expect(payload.repository.projectId).toBe('canon-project');
      expect(payload.supersededProjectId).toBe('prov-project');
      expect(payload.checkout.repositoryId).toBe('canon-repo');
    });
  });

  describe('repositoryNameFromRemote', () => {
    it('keeps the last two path segments (owner/repo)', () => {
      expect(repositoryNameFromRemote('https://github.com/acme/monorepo')).toBe(
        'acme/monorepo',
      );
    });

    it('disambiguates repos that share a bare last segment', () => {
      expect(
        repositoryNameFromRemote('https://github.com/other/monorepo'),
      ).toBe('other/monorepo');
    });

    it('falls back to the single segment when only one exists', () => {
      expect(repositoryNameFromRemote('monorepo')).toBe('monorepo');
    });

    it('returns null for an empty string', () => {
      expect(repositoryNameFromRemote('')).toBeNull();
    });
  });

  describe('repositoryNameFromGitUrl', () => {
    it('derives owner/repo from an https url with a .git suffix', () => {
      expect(
        repositoryNameFromGitUrl('https://github.com/acme/monorepo.git'),
      ).toBe('acme/monorepo');
    });

    it('derives owner/repo from an scp-like ssh url with a .git suffix', () => {
      expect(repositoryNameFromGitUrl('git@github.com:acme/monorepo.git')).toBe(
        'acme/monorepo',
      );
    });

    it('derives owner/repo from an ssh:// url', () => {
      expect(
        repositoryNameFromGitUrl('ssh://git@github.com/acme/monorepo'),
      ).toBe('acme/monorepo');
    });

    it('falls back to the single segment when only one exists', () => {
      expect(repositoryNameFromGitUrl('monorepo.git')).toBe('monorepo');
    });

    it('returns null for an empty string', () => {
      expect(repositoryNameFromGitUrl('')).toBeNull();
    });
  });

  describe('workspaceRepository', () => {
    const ownedCheckout = (repository: Repository): RepositoryCheckout =>
      asMock<RepositoryCheckout>({
        displayName: 'monorepo',
        filesystemPath: join(workspaceRoot, 'gone'),
        id: 'checkout-detail',
        // Fresh stored snapshot so resolveInspection serves it without a scan.
        inspection: {
          agentConfig: {},
          git: { normalizedRemoteUrl: repository.normalizedRemoteUrl },
          scannedAt: '2026-07-26T00:00:00.000Z',
          stack: {},
          warnings: [],
        },
        repository,
        repositoryId: repository.id,
        scannedAt: new Date(),
        userId,
      });

    it('returns the repository with the user checkouts for an owned repo', async () => {
      const repository = asMock<Repository>({
        id: 'repo-detail',
        name: 'acme/monorepo',
        normalizedRemoteUrl: 'https://github.com/acme/monorepo',
        projectId: 'proj-1',
      });
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([ownedCheckout(repository)]);

      const result = await service.workspaceRepository(userId, 'repo-detail');

      expect(result?.id).toBe('repo-detail');
      expect(result?.name).toBe('acme/monorepo');
      expect(result?.checkouts).toHaveLength(1);
      expect(result?.checkouts?.[0]?.id).toBe('checkout-detail');
      expect(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).toHaveBeenCalledWith('repo-detail', userId);
    });

    it('returns null when the user owns no checkout of the repository', async () => {
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([]);

      await expect(
        service.workspaceRepository(userId, 'repo-unowned'),
      ).resolves.toBeNull();
      expect(mockRepositoriesService.findById).not.toHaveBeenCalled();
    });
  });

  describe('updateRepository', () => {
    const ownedCheckout = (repository: Repository): RepositoryCheckout =>
      asMock<RepositoryCheckout>({
        displayName: 'monorepo',
        filesystemPath: join(workspaceRoot, 'gone'),
        id: 'checkout-edit',
        inspection: null,
        repository,
        repositoryId: repository.id,
        scannedAt: null,
        userId,
      });

    it('updates name, default branch, and project link for an owned repo', async () => {
      const before = asMock<Repository>({
        id: 'repo-edit',
        name: 'monorepo',
        normalizedRemoteUrl: 'https://github.com/acme/monorepo',
        projectId: null,
      });
      const after = asMock<Repository>({
        id: 'repo-edit',
        name: 'acme/monorepo',
        normalizedRemoteUrl: 'https://github.com/acme/monorepo',
        projectId: 'proj-2',
      });
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([ownedCheckout(before)]);
      vi.mocked(mockRepositoriesService.update).mockResolvedValue(after);

      const result = await service.updateRepository(userId, {
        defaultBranch: 'develop',
        id: 'repo-edit',
        name: '  acme/monorepo  ',
        projectId: 'proj-2',
      });

      expect(mockRepositoriesService.update).toHaveBeenCalledWith('repo-edit', {
        defaultBranch: 'develop',
        name: 'acme/monorepo',
        projectId: 'proj-2',
      });
      expect(result.name).toBe('acme/monorepo');
      expect(result.projectId).toBe('proj-2');
    });

    it('clears the project link when projectId is null', async () => {
      const repository = asMock<Repository>({
        id: 'repo-clear',
        name: 'acme/monorepo',
        projectId: 'proj-old',
      });
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([ownedCheckout(repository)]);
      vi.mocked(mockRepositoriesService.update).mockResolvedValue(
        asMock<Repository>({ ...repository, projectId: null }),
      );

      await service.updateRepository(userId, {
        id: 'repo-clear',
        projectId: null,
      });

      expect(mockRepositoriesService.update).toHaveBeenCalledWith(
        'repo-clear',
        {
          projectId: null,
        },
      );
    });

    it('persists the injection flag and applies it to disk on a flag-only edit', async () => {
      const repository = asMock<Repository>({
        id: 'repo-inject',
        name: 'acme/monorepo',
        projectId: null,
      });
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([ownedCheckout(repository)]);

      await service.updateRepository(userId, {
        foreignSkillInjectionEnabled: true,
        id: 'repo-inject',
      });

      expect(
        mockCheckoutsService.setForeignSkillInjectionEnabledForRepository,
      ).toHaveBeenCalledWith(userId, 'repo-inject', true);
      expect(
        mockForeignSkillMaterialization.applyForRepository,
      ).toHaveBeenCalledWith(userId, 'repo-inject', true);
      // Flag-only edit must not touch the shared repository row.
      expect(mockRepositoriesService.update).not.toHaveBeenCalled();
    });

    it('does not apply injection when the flag is omitted', async () => {
      const repository = asMock<Repository>({
        id: 'repo-noinject',
        name: 'acme/monorepo',
        projectId: null,
      });
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([ownedCheckout(repository)]);
      vi.mocked(mockRepositoriesService.update).mockResolvedValue(repository);

      await service.updateRepository(userId, {
        id: 'repo-noinject',
        name: 'renamed',
      });

      expect(
        mockForeignSkillMaterialization.applyForRepository,
      ).not.toHaveBeenCalled();
    });

    it('rejects an edit when the user owns no checkout of the repository', async () => {
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([]);

      await expect(
        service.updateRepository(userId, { id: 'repo-x', name: 'nope' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepositoriesService.update).not.toHaveBeenCalled();
    });

    it('rejects an empty name', async () => {
      vi.mocked(
        mockCheckoutsService.findByRepositoryIdForUser,
      ).mockResolvedValue([
        ownedCheckout(asMock<Repository>({ id: 'repo-empty' })),
      ]);

      await expect(
        service.updateRepository(userId, { id: 'repo-empty', name: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepositoriesService.update).not.toHaveBeenCalled();
    });
  });

  describe('cloneRepository', () => {
    let cloneRoot: string;

    beforeEach(async () => {
      cloneRoot = await mkdtemp(join(tmpdir(), 'ot-clone-root-'));
      process.env[CHECKOUT_ROOT_ENV] = cloneRoot;
      vi.mocked(mockCheckoutsService.create).mockImplementation(
        async (_userId, data) =>
          asMock<RepositoryCheckout>({
            displayName: data.displayName,
            filesystemPath: data.filesystemPath,
            id: 'clone-checkout',
            managed: data.managed ?? false,
            repositoryId: data.repositoryId,
          }),
      );
      vi.mocked(mockRepositoriesService.create).mockResolvedValue(
        asMock<Repository>({ id: 'clone-repo', name: 'fixture-repo' }),
      );
    });

    afterEach(async () => {
      delete process.env[CHECKOUT_ROOT_ENV];
      await rm(cloneRoot, { force: true, recursive: true });
    });

    it('clones into the checkout root and registers a managed checkout', async () => {
      const payload = await service.cloneRepository(userId, {
        // Explicit name keeps the on-disk folder deterministic; the derived
        // owner/repo name is covered by the helper unit tests below.
        gitUrl: `file://${gitRepoDir}`,
        name: 'fixture-repo',
      });

      // Landed in the managed root as a real git working copy.
      expect(existsSync(join(cloneRoot, 'fixture-repo', '.git'))).toBe(true);
      // Registered as a managed checkout through the shared pipeline.
      expect(vi.mocked(mockCheckoutsService.create)).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ managed: true }),
      );
      expect(payload.checkout).toBeDefined();
    }, 30_000);

    it('throws a user-facing error naming the env var when OPENTHROTTLE_CHECKOUT_ROOT is unset', async () => {
      delete process.env[CHECKOUT_ROOT_ENV];

      const error = await service
        .cloneRepository(userId, { gitUrl: `file://${gitRepoDir}` })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(WorkspaceFolderError);
      if (error instanceof WorkspaceFolderError) {
        expect(error.code).toBe(
          WorkspaceFolderErrorCode.CHECKOUT_ROOT_NOT_CONFIGURED,
        );
        expect(error.message).toContain(CHECKOUT_ROOT_ENV);
      }
      expect(vi.mocked(mockCheckoutsService.create)).not.toHaveBeenCalled();
    });

    it('throws a user-facing error when the git binary is missing (spawn ENOENT)', async () => {
      const originalPath = process.env.PATH;
      const emptyBin = await mkdtemp(join(tmpdir(), 'ot-empty-bin-'));
      process.env.PATH = emptyBin;

      try {
        const error = await service
          .cloneRepository(userId, {
            gitUrl: `file://${gitRepoDir}`,
            name: 'no-git',
          })
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(WorkspaceFolderError);
        if (error instanceof WorkspaceFolderError) {
          expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_NOT_INSTALLED);
        }
      } finally {
        process.env.PATH = originalPath;
        await rm(emptyBin, { force: true, recursive: true });
      }
      expect(existsSync(join(cloneRoot, 'no-git'))).toBe(false);
      expect(vi.mocked(mockCheckoutsService.create)).not.toHaveBeenCalled();
    });

    it('throws a user-facing error when the checkout root cannot be created', async () => {
      const blocker = join(cloneRoot, 'a-file');
      await execFileAsync('touch', [blocker]);
      process.env[CHECKOUT_ROOT_ENV] = join(blocker, 'nested');

      const error = await service
        .cloneRepository(userId, { gitUrl: `file://${gitRepoDir}` })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(WorkspaceFolderError);
      if (error instanceof WorkspaceFolderError) {
        expect(error.code).toBe(
          WorkspaceFolderErrorCode.CHECKOUT_ROOT_NOT_WRITABLE,
        );
      }
    });

    it.each([
      'not a git url',
      'owner/repo/extra',
      'owner/..',
      'https://user:ghp_secret@github.com/o/r.git',
    ])('rejects %j as a classified GIT_URL_INVALID error', async (gitUrl) => {
      const error = await service
        .cloneRepository(userId, { gitUrl })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(WorkspaceFolderError);
      if (error instanceof WorkspaceFolderError) {
        expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_URL_INVALID);
        expect(error.message).not.toContain('ghp_secret');
      }
      expect(vi.mocked(mockCheckoutsService.create)).not.toHaveBeenCalled();
    });

    describe('GitHub inputs (git stubbed so nothing touches the network)', () => {
      const CANONICAL = 'https://github.com/openthrottle/monorepo.git';
      const NORMALIZED = 'https://github.com/openthrottle/monorepo';
      let stubDir: string;
      let argvFile: string;
      const savedEnv = {
        path: process.env.PATH,
        preferHttps: process.env.OPENTHROTTLE_GIT_PREFER_HTTPS,
      };

      /** `git clone` is faked (init + `remote add origin <url>`); all else is real git. */
      beforeEach(async () => {
        stubDir = await mkdtemp(join(tmpdir(), 'ot-stub-git-'));
        argvFile = join(stubDir, 'clone-argv.txt');
        const { stdout } = await execFileAsync('which', ['git']);
        const script = [
          '#!/bin/sh',
          'if [ "$1" = "clone" ]; then',
          `  printf '%s\\n' "$@" > '${argvFile}'`,
          `  '${stdout.trim()}' init --quiet "$4" && '${stdout.trim()}' -C "$4" remote add origin "$3"`,
          '  exit $?',
          'fi',
          `exec '${stdout.trim()}' "$@"`,
          '',
        ].join('\n');
        await writeFile(join(stubDir, 'git'), script, { mode: 0o755 });
        process.env.PATH = `${stubDir}:${savedEnv.path ?? ''}`;
        vi.mocked(
          mockRepositoriesService.findByNormalizedRemoteUrl,
        ).mockResolvedValue(null);
      });

      afterEach(async () => {
        process.env.PATH = savedEnv.path;
        if (savedEnv.preferHttps === undefined) {
          delete process.env.OPENTHROTTLE_GIT_PREFER_HTTPS;
        } else {
          process.env.OPENTHROTTLE_GIT_PREFER_HTTPS = savedEnv.preferHttps;
        }
        await rm(stubDir, { force: true, recursive: true });
      });

      const cloneArgv = async (): Promise<readonly string[]> =>
        (await readFile(argvFile, 'utf8')).split('\n').filter(Boolean);

      it.each([
        'openthrottle/monorepo',
        'https://github.com/openthrottle/monorepo',
        'https://github.com/openthrottle/monorepo.git',
        'git@github.com:openthrottle/monorepo.git',
        'ssh://git@github.com/openthrottle/monorepo.git',
      ])(
        'registers %j under one normalized remote and names the folder after the repo',
        async (gitUrl) => {
          process.env.OPENTHROTTLE_GIT_PREFER_HTTPS = 'true';

          await service.cloneRepository(userId, { gitUrl });

          const [, url, target] = await cloneArgv().then((argv) =>
            argv.slice(1),
          );
          expect(url).toBe(CANONICAL);
          expect(new URL(url ?? '').username).toBe('');
          expect(new URL(url ?? '').password).toBe('');
          expect(target).toBe(join(cloneRoot, 'monorepo'));
          expect(
            vi.mocked(mockRepositoriesService.create),
          ).toHaveBeenCalledWith(
            expect.objectContaining({ normalizedRemoteUrl: NORMALIZED }),
          );
          expect(vi.mocked(mockCheckoutsService.create)).toHaveBeenCalledWith(
            userId,
            expect.objectContaining({ displayName: 'monorepo', managed: true }),
          );
        },
        30_000,
      );

      it('leaves an explicit SSH URL on SSH when HTTPS is not preferred, with the same normalized remote', async () => {
        delete process.env.OPENTHROTTLE_GIT_PREFER_HTTPS;

        await service.cloneRepository(userId, {
          gitUrl: 'git@github.com:openthrottle/monorepo.git',
        });

        expect((await cloneArgv())[2]).toBe(
          'git@github.com:openthrottle/monorepo.git',
        );
        expect(vi.mocked(mockRepositoriesService.create)).toHaveBeenCalledWith(
          expect.objectContaining({ normalizedRemoteUrl: NORMALIZED }),
        );
      }, 30_000);

      it('still resolves the owner/repo shorthand to HTTPS when HTTPS is not preferred', async () => {
        delete process.env.OPENTHROTTLE_GIT_PREFER_HTTPS;

        await service.cloneRepository(userId, {
          gitUrl: 'openthrottle/monorepo',
        });

        expect((await cloneArgv())[2]).toBe(CANONICAL);
      }, 30_000);

      it('lets an explicit name override the derived repo name', async () => {
        await service.cloneRepository(userId, {
          gitUrl: 'openthrottle/monorepo',
          name: 'my-copy',
        });

        expect((await cloneArgv())[3]).toBe(join(cloneRoot, 'my-copy'));
      }, 30_000);
    });

    it('leaves no partial directory or rows when the clone fails', async () => {
      const missing = join(workspaceRoot, 'does-not-exist-repo');

      const error = await service
        .cloneRepository(userId, { gitUrl: `file://${missing}` })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(WorkspaceFolderError);
      if (error instanceof WorkspaceFolderError) {
        expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_CLONE_FAILED);
        expect(error.message).toContain('git clone failed');
      }

      expect(existsSync(join(cloneRoot, 'does-not-exist-repo'))).toBe(false);
      expect(vi.mocked(mockCheckoutsService.create)).not.toHaveBeenCalled();
    }, 30_000);
  });
});

describe('getCheckoutRoot', () => {
  it('expands a ~-relative root, as .env.default documents', () => {
    // Regression: this used isAbsolute() WITHOUT expanding `~`, so the value shipped in
    // .env.default ("~/OpenThrottle/repositories") resolved to null and silently disabled cloning
    // — the button did nothing and said nothing.
    expect(
      getCheckoutRoot({ [CHECKOUT_ROOT_ENV]: '~/OpenThrottle/repositories' }),
    ).toBe(join(homedir(), 'OpenThrottle/repositories'));
  });

  it('still accepts a plain absolute path', () => {
    expect(getCheckoutRoot({ [CHECKOUT_ROOT_ENV]: '/srv/repos' })).toBe(
      '/srv/repos',
    );
  });

  it.each([undefined, '', '   ', 'relative/repos', '~other/repos'])(
    'disables cloning for %p',
    (value) => {
      expect(getCheckoutRoot({ [CHECKOUT_ROOT_ENV]: value })).toBeNull();
    },
  );
});
