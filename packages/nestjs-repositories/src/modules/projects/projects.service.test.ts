import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Project } from './project.entity';
import { projectsFactory } from './projects.factory';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  type GetRepository = ReturnType<ProjectsService['getRepository']>;

  let service: ProjectsService;

  beforeAll(async () => {
    const mockRepo = createMock<GetRepository>({
      create: (data) => projectsFactory.build(data),
      find: () => Promise.resolve(projectsFactory.buildList(2)),
      findOne: () => Promise.resolve(projectsFactory.build()),
      merge: () => {},
      save: (entity) => Promise.resolve(entity),
    });
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        ProjectsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = app.get<ProjectsService>(ProjectsService);
  });

  describe('getRepository', () => {
    it('returns the project repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });
  });

  describe('findById', () => {
    it('returns a project when found', async () => {
      const project = await service.findById('test-id');

      expect(project).toBeDefined();
      expect(project).toMatchObject({
        name: expect.any(String),
      });
    });
  });

  describe('findAll', () => {
    it('returns factory-built data from find', async () => {
      const projects = await service.findAll();

      expect(projects).toHaveLength(2);
      expect(projects[0]).toMatchObject({
        name: expect.any(String),
      });
    });
  });

  describe('create', () => {
    it('creates and returns a project', async () => {
      const created = await service.create({ name: 'New Project' });

      expect(created).toBeDefined();
      expect(created).toMatchObject({ name: 'New Project' });
    });
  });

  describe('update', () => {
    it('returns updated project when found', async () => {
      const updated = await service.update('test-id', { name: 'Updated Name' });

      expect(updated).toBeDefined();
    });
  });
});
