import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createQueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import type { ObjectLiteral, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectsFactory } from '../projects/projects.factory.ts';
import { repositoriesFactory } from '../repositories/repositories.factory.ts';
import { projectRepositoriesFactory } from './project-repositories.factory.ts';
import { ProjectRepositoriesRepository } from './project-repositories.repository.ts';
import { ProjectRepository } from './project-repository.entity.ts';

const projectId = '66666666-6666-4666-8666-666666666666';
const otherProjectId = '77777777-7777-4777-8777-777777777777';
const repositoryId = '88888888-8888-4888-8888-888888888888';

describe('ProjectRepositoriesRepository', () => {
  const findOne = vi.fn();
  const create = vi.fn();
  const save = vi.fn();
  const remove = vi.fn();
  const builder = createQueryBuilderMock<ObjectLiteral>();
  let repository: ProjectRepositoriesRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    findOne.mockResolvedValue(null);
    create.mockImplementation((data: Partial<ProjectRepository>) => {
      return projectRepositoriesFactory.build(data);
    });
    save.mockImplementation(async (entity: ProjectRepository) => {
      return entity;
    });
    remove.mockResolvedValue({ affected: 1, raw: [] });

    const app = await Test.createTestingModule({
      providers: [
        ProjectRepositoriesRepository,
        {
          provide: getRepositoryToken(ProjectRepository),
          useValue: createMock<Repository<ProjectRepository>>({
            create,
            createQueryBuilder: vi.fn(() => {
              return builder;
            }),
            delete: remove,
            findOne,
            save,
            target: ProjectRepository,
          }),
        },
      ],
    }).compile();

    repository = app.get(ProjectRepositoriesRepository);
  });

  describe('findByProjectAndRepository', () => {
    it('looks the pair up', async () => {
      const row = projectRepositoriesFactory.build({ projectId, repositoryId });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByProjectAndRepository(projectId, repositoryId),
      ).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({
        where: { projectId, repositoryId },
      });
    });
  });

  describe('link', () => {
    it('returns the existing link without inserting', async () => {
      const row = projectRepositoriesFactory.build({ projectId, repositoryId });
      findOne.mockResolvedValue(row);

      await expect(repository.link(projectId, repositoryId)).resolves.toBe(row);
      expect(save).not.toHaveBeenCalled();
    });

    it('inserts the link when the pair is new', async () => {
      const result = await repository.link(projectId, repositoryId);

      expect(result.projectId).toBe(projectId);
      expect(result.repositoryId).toBe(repositoryId);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('resolves to the winner when a concurrent link wins the insert', async () => {
      const winner = projectRepositoriesFactory.build({
        projectId,
        repositoryId,
      });
      findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
      save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
        ),
      );

      await expect(repository.link(projectId, repositoryId)).resolves.toBe(
        winner,
      );
    });

    it('rethrows a non-unique failure', async () => {
      const failure = new Error('connection lost');
      save.mockRejectedValue(failure);

      await expect(repository.link(projectId, repositoryId)).rejects.toBe(
        failure,
      );
    });
  });

  describe('unlink', () => {
    it('deletes the pair and reports it was linked', async () => {
      await expect(repository.unlink(projectId, repositoryId)).resolves.toBe(
        true,
      );
      expect(remove).toHaveBeenCalledWith({ projectId, repositoryId });
    });

    it('reports false when the pair was not linked', async () => {
      remove.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repository.unlink(projectId, repositoryId)).resolves.toBe(
        false,
      );
    });
  });

  describe('syncLegacyProject', () => {
    it('links a newly set project', async () => {
      await repository.syncLegacyProject(repositoryId, null, projectId);

      expect(remove).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('moves the link from P to Q', async () => {
      await repository.syncLegacyProject(
        repositoryId,
        projectId,
        otherProjectId,
      );

      expect(remove).toHaveBeenCalledWith({ projectId, repositoryId });
      expect(create).toHaveBeenCalledWith({
        projectId: otherProjectId,
        repositoryId,
      });
    });

    it('removes the old link when the project is cleared', async () => {
      await repository.syncLegacyProject(repositoryId, projectId, null);

      expect(remove).toHaveBeenCalledWith({ projectId, repositoryId });
      expect(save).not.toHaveBeenCalled();
    });

    it('keeps the link when the project is unchanged', async () => {
      await repository.syncLegacyProject(repositoryId, projectId, projectId);

      expect(remove).not.toHaveBeenCalled();
    });

    it('does nothing when there was and is no project', async () => {
      await repository.syncLegacyProject(repositoryId, null, null);

      expect(remove).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('listRepositoriesByProjectIds', () => {
    it('skips the query for no ids', async () => {
      await expect(
        repository.listRepositoriesByProjectIds([]),
      ).resolves.toEqual(new Map());
      expect(builder.getMany).not.toHaveBeenCalled();
    });

    it('groups live repositories under their project', async () => {
      const first = repositoriesFactory.build();
      const second = repositoriesFactory.build();
      builder.getMany.mockResolvedValue([
        {
          ...projectRepositoriesFactory.build({ projectId }),
          repository: first,
        },
        {
          ...projectRepositoriesFactory.build({ projectId }),
          repository: second,
        },
        {
          ...projectRepositoriesFactory.build({ projectId: otherProjectId }),
          repository: first,
        },
      ]);

      const result = await repository.listRepositoriesByProjectIds([
        projectId,
        otherProjectId,
      ]);

      expect(result.get(projectId)).toEqual([first, second]);
      expect(result.get(otherProjectId)).toEqual([first]);
      expect(builder.where).toHaveBeenCalledWith(
        'link.project_id IN (:...projectIds)',
        { projectIds: [projectId, otherProjectId] },
      );
    });
  });

  describe('listProjectsByRepositoryIds', () => {
    it('skips the query for no ids', async () => {
      await expect(repository.listProjectsByRepositoryIds([])).resolves.toEqual(
        new Map(),
      );
      expect(builder.getMany).not.toHaveBeenCalled();
    });

    it('groups live projects under their repository', async () => {
      const project = projectsFactory.build();
      builder.getMany.mockResolvedValue([
        { ...projectRepositoriesFactory.build({ repositoryId }), project },
      ]);

      const result = await repository.listProjectsByRepositoryIds([
        repositoryId,
      ]);

      expect(result.get(repositoryId)).toEqual([project]);
    });
  });
});
