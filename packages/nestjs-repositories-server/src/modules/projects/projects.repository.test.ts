import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Project } from './project.entity.ts';
import { projectsFactory } from './projects.factory.ts';
import { ProjectsRepository } from './projects.repository.ts';

describe('ProjectsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  let repository: ProjectsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        ProjectsRepository,
        {
          provide: getRepositoryToken(Project),
          useValue: createMock<Repository<Project>>({
            find,
            findOne,
            target: Project,
          }),
        },
      ],
    }).compile();

    repository = app.get<ProjectsRepository>(ProjectsRepository);
  });

  describe('findByNxProjectName', () => {
    it('looks a live project up by its nx_project_name', async () => {
      const project = projectsFactory.build({ nxProjectName: 'monorepo' });
      findOne.mockResolvedValue(project);

      const found = await repository.findByNxProjectName('monorepo');

      expect(found).toBe(project);
      expect(findOne).toHaveBeenCalledWith({
        where: { nxProjectName: 'monorepo' },
      });
    });

    it('returns null when no project has that name', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.findByNxProjectName('nope')).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns projects newest first with clamped pagination', async () => {
      const projects = projectsFactory.buildList(2);
      find.mockResolvedValue(projects);

      const found = await repository.findAll({ limit: 5, offset: 10 });

      expect(found).toBe(projects);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 5,
      });
    });

    it('applies the default page when no pagination is given', async () => {
      find.mockResolvedValue([]);

      await repository.findAll();

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });
  });
});
