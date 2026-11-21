import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager, Repository as OrmRepository } from 'typeorm';
import { IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectRepositoriesRepository } from '../project-repositories/project-repositories.repository.ts';
import { createProjectRepositoriesRepositoryMock } from '../project-repositories/project-repositories.utils.ts';
import { RepositoryCheckout } from '../repository-checkouts/repository-checkout.entity.ts';
import { repositoriesFactory } from './repositories.factory.ts';
import { RepositoriesRepository } from './repositories.repository.ts';
import { Repository } from './repository.entity.ts';

describe('RepositoriesRepository', () => {
  const findOne = vi.fn();
  const create = vi.fn();
  const save = vi.fn();
  const transaction = vi.fn();
  const managerFindOne = vi.fn();
  const managerFindOneOrFail = vi.fn();
  const managerSave = vi.fn();
  const managerSoftDelete = vi.fn();
  const managerUpdate = vi.fn();
  const projectRepositories = createProjectRepositoriesRepositoryMock();
  let repository: RepositoriesRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    projectRepositories.syncLegacyProject.mockResolvedValue(undefined);
    create.mockImplementation((data: Partial<Repository>) => {
      return repositoriesFactory.build(data);
    });
    save.mockImplementation(async (entity: Repository) => {
      return entity;
    });
    managerSave.mockImplementation(async (entity: Repository) => {
      return entity;
    });
    const manager = createMock<EntityManager>({
      findOne: managerFindOne,
      findOneOrFail: managerFindOneOrFail,
      save: managerSave,
      softDelete: managerSoftDelete,
      update: managerUpdate,
    });
    transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) => {
        return run(manager);
      },
    );

    const app = await Test.createTestingModule({
      providers: [
        RepositoriesRepository,
        {
          provide: ProjectRepositoriesRepository,
          useValue: projectRepositories,
        },
        {
          provide: getRepositoryToken(Repository),
          useValue: createMock<OrmRepository<Repository>>({
            create,
            findOne,
            manager: createMock<EntityManager>({ transaction }),
            save,
            target: Repository,
          }),
        },
      ],
    }).compile();

    repository = app.get<RepositoriesRepository>(RepositoriesRepository);
  });

  describe('findRepositoryById', () => {
    it('returns the live repository', async () => {
      const row = repositoriesFactory.build();
      findOne.mockResolvedValue(row);

      await expect(repository.findRepositoryById(row.id)).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({ where: { id: row.id } });
    });

    it('returns null instead of throwing when nothing matches', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.findRepositoryById('missing'),
      ).resolves.toBeNull();
    });
  });

  describe('findByNormalizedRemoteUrl', () => {
    it('looks a live repository up by its normalized remote', async () => {
      const row = repositoriesFactory.build();
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByNormalizedRemoteUrl('https://github.com/o/r'),
      ).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({
        where: { normalizedRemoteUrl: 'https://github.com/o/r' },
      });
    });
  });

  describe('create', () => {
    it('links a repository created with a project', async () => {
      const created = await repository.create({
        defaultBranch: null,
        name: 'Linked',
        normalizedRemoteUrl: null,
        projectId: 'project-1',
      });

      expect(projectRepositories.syncLegacyProject).toHaveBeenCalledWith(
        created.id,
        null,
        'project-1',
      );
    });

    it('does not link a repository created without a project', async () => {
      await repository.create({
        defaultBranch: null,
        name: 'Unlinked',
        normalizedRemoteUrl: null,
        projectId: null,
      });

      expect(projectRepositories.syncLegacyProject).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateByRemoteUrl', () => {
    it('returns the existing canonical repository for an equivalent remote', async () => {
      const existing = repositoriesFactory.build();
      findOne.mockResolvedValue(existing);

      const result = await repository.findOrCreateByRemoteUrl(
        'git@github.com:OpenThrottle/monorepo.git',
        { defaultBranch: null, name: 'ignored', projectId: null },
      );

      expect(result).toBe(existing);
      expect(findOne).toHaveBeenCalledWith({
        where: {
          normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
        },
      });
      expect(save).not.toHaveBeenCalled();
    });

    it('creates a canonical repository when the remote is new', async () => {
      findOne.mockResolvedValue(null);

      const result = await repository.findOrCreateByRemoteUrl(
        'https://github.com/org/fresh.git',
        { defaultBranch: 'main', name: 'Fresh', projectId: null },
      );

      expect(result.normalizedRemoteUrl).toBe('https://github.com/org/fresh');
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fresh',
          normalizedRemoteUrl: 'https://github.com/org/fresh',
        }),
      );
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('creates a provisional repository for a null remote', async () => {
      const result = await repository.findOrCreateByRemoteUrl(null, {
        defaultBranch: null,
        name: 'Local only',
        projectId: null,
      });

      expect(result.normalizedRemoteUrl).toBeNull();
      expect(findOne).not.toHaveBeenCalled();
    });

    it('creates a provisional repository for an unrecognizable remote', async () => {
      const result = await repository.findOrCreateByRemoteUrl('/not/a/remote', {
        defaultBranch: null,
        name: 'Local only',
        projectId: null,
      });

      expect(result.normalizedRemoteUrl).toBeNull();
      expect(findOne).not.toHaveBeenCalled();
    });
  });

  describe('updateRepository', () => {
    it('returns null when the repository does not exist', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.updateRepository('missing', { name: 'Renamed' }),
      ).resolves.toBeNull();
      expect(save).not.toHaveBeenCalled();
    });

    it('updates only the provided fields', async () => {
      const existing = repositoriesFactory.build({
        name: 'OpenThrottle',
        projectId: null,
      });
      findOne.mockResolvedValue(existing);

      const result = await repository.updateRepository(existing.id, {
        projectId: 'project-1',
      });

      expect(result?.projectId).toBe('project-1');
      expect(result?.name).toBe('OpenThrottle');
    });

    it('does not touch the join table when projectId is omitted', async () => {
      const existing = repositoriesFactory.build({ projectId: 'project-1' });
      findOne.mockResolvedValue(existing);

      await repository.updateRepository(existing.id, { name: 'Renamed' });

      expect(projectRepositories.syncLegacyProject).not.toHaveBeenCalled();
    });

    it('links the repository when a project is first set', async () => {
      const existing = repositoriesFactory.build({ projectId: null });
      findOne.mockResolvedValue(existing);

      await repository.updateRepository(existing.id, {
        projectId: 'project-1',
      });

      expect(projectRepositories.syncLegacyProject).toHaveBeenCalledWith(
        existing.id,
        null,
        'project-1',
      );
    });

    it('moves the link when the project changes from P to Q', async () => {
      const existing = repositoriesFactory.build({ projectId: 'project-p' });
      findOne.mockResolvedValue(existing);

      await repository.updateRepository(existing.id, {
        projectId: 'project-q',
      });

      expect(projectRepositories.syncLegacyProject).toHaveBeenCalledWith(
        existing.id,
        'project-p',
        'project-q',
      );
    });

    it('drops the old link when the project is cleared', async () => {
      const existing = repositoriesFactory.build({ projectId: 'project-p' });
      findOne.mockResolvedValue(existing);

      await repository.updateRepository(existing.id, { projectId: null });

      expect(projectRepositories.syncLegacyProject).toHaveBeenCalledWith(
        existing.id,
        'project-p',
        null,
      );
    });

    it('can clear the project link with an explicit null', async () => {
      const existing = repositoriesFactory.build({ projectId: 'project-1' });
      findOne.mockResolvedValue(existing);

      const result = await repository.updateRepository(existing.id, {
        projectId: null,
      });

      expect(result?.projectId).toBeNull();
    });
  });

  describe('mergeDetectedRemote', () => {
    const provisional = repositoriesFactory.build({
      id: 'prov-repo',
      normalizedRemoteUrl: null,
      projectId: 'prov-project',
    });

    it('merges into the canonical row: checkouts re-point, provisional soft deleted, canonical project wins', async () => {
      const canonical = repositoriesFactory.build({
        projectId: 'canon-project',
      });
      managerFindOne
        .mockResolvedValueOnce({ ...provisional })
        .mockResolvedValueOnce(canonical);

      const result = await repository.mergeDetectedRemote(
        'prov-repo',
        'https://github.com/openthrottle/monorepo',
      );

      expect(result?.merged).toBe(true);
      expect(result?.repository.projectId).toBe('canon-project');
      expect(result?.supersededProjectId).toBe('prov-project');
      expect(managerFindOne.mock.calls).toEqual([
        [
          Repository,
          {
            lock: { mode: 'pessimistic_write' },
            where: { deletedAt: IsNull(), id: 'prov-repo' },
          },
        ],
        [
          Repository,
          {
            where: {
              deletedAt: IsNull(),
              normalizedRemoteUrl: 'https://github.com/openthrottle/monorepo',
            },
          },
        ],
      ]);
      expect(managerUpdate).toHaveBeenCalledWith(
        RepositoryCheckout,
        { deletedAt: IsNull(), repositoryId: 'prov-repo' },
        { repositoryId: canonical.id },
      );
      expect(managerSoftDelete).toHaveBeenCalledWith(Repository, {
        deletedAt: IsNull(),
        id: 'prov-repo',
      });
    });

    it('promotes the provisional row in place when no canonical row matches', async () => {
      managerFindOne
        .mockResolvedValueOnce({ ...provisional })
        .mockResolvedValueOnce(null);

      const result = await repository.mergeDetectedRemote(
        'prov-repo',
        'https://github.com/org/new-remote',
      );

      expect(result?.merged).toBe(false);
      expect(result?.repository.normalizedRemoteUrl).toBe(
        'https://github.com/org/new-remote',
      );
      expect(result?.repository.projectId).toBe('prov-project');
      expect(managerSoftDelete).not.toHaveBeenCalled();
    });

    it('no-ops for a repository that is already canonical', async () => {
      const canonical = repositoriesFactory.build();
      managerFindOne.mockResolvedValueOnce(canonical);

      const result = await repository.mergeDetectedRemote(
        canonical.id,
        'https://github.com/org/other',
      );

      expect(result?.merged).toBe(false);
      expect(result?.repository).toBe(canonical);
      expect(managerSoftDelete).not.toHaveBeenCalled();
      expect(managerUpdate).not.toHaveBeenCalled();
    });

    it('returns null when the repository does not exist or is soft deleted', async () => {
      managerFindOne.mockResolvedValueOnce(null);

      await expect(
        repository.mergeDetectedRemote('missing', 'https://github.com/o/r'),
      ).resolves.toBeNull();
    });
  });

  describe('removeRepository', () => {
    it('soft deletes the live repository, then its live checkouts, in one transaction', async () => {
      managerSoftDelete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(repository.removeRepository('repo-1')).resolves.toBe(true);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(managerSoftDelete.mock.calls).toEqual([
        [Repository, { deletedAt: IsNull(), id: 'repo-1' }],
        [RepositoryCheckout, { deletedAt: IsNull(), repositoryId: 'repo-1' }],
      ]);
    });

    it('returns false and leaves the checkouts alone when no live repository matched', async () => {
      managerSoftDelete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repository.removeRepository('missing')).resolves.toBe(false);

      expect(managerSoftDelete).toHaveBeenCalledTimes(1);
      expect(managerSoftDelete).toHaveBeenCalledWith(Repository, {
        deletedAt: IsNull(),
        id: 'missing',
      });
    });
  });

  describe('remove', () => {
    it('cascades to the checkouts and returns the deleted repository', async () => {
      const deleted = repositoriesFactory.build({
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      managerSoftDelete.mockResolvedValue({ affected: 1, raw: [] });
      managerFindOneOrFail.mockResolvedValue(deleted);

      const result = await repository.remove(deleted.id);

      expect(result).toBe(deleted);
      expect(managerSoftDelete.mock.calls).toEqual([
        [Repository, { deletedAt: IsNull(), id: deleted.id }],
        [RepositoryCheckout, { deletedAt: IsNull(), repositoryId: deleted.id }],
      ]);
      expect(managerFindOneOrFail).toHaveBeenCalledWith(Repository, {
        where: { id: deleted.id },
        withDeleted: true,
      });
    });

    it('throws NotFoundException and leaves the checkouts alone when no live repository has the id', async () => {
      managerSoftDelete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repository.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.remove('missing')).rejects.toThrow(
        'repositories record with ID "missing" not found',
      );
      expect(
        managerSoftDelete.mock.calls.every(([entity]) => {
          return entity === Repository;
        }),
      ).toBe(true);
    });
  });
});
