import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PlansService } from '../plans/plans.service';
import { Task } from './task.entity';
import { tasksFactory } from './tasks.factory';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  type GetRepository = ReturnType<TasksService['getRepository']>;

  let service: TasksService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        TasksService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PlansService,
          useValue: createMock<PlansService>({
            getRepository: vi.fn().mockReturnValue({
              update: vi
                .fn()
                .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] }),
            }),
          }),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(tasksFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<TasksService>(TasksService);
  });

  describe('getRepository', () => {
    it('returns the task repository', () => {
      const repo = service.getRepository();
      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const tasks = await repo.find();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toMatchObject({
        planId: expect.any(String),
        status: expect.any(String),
        title: expect.any(String),
      });
    });
  });
});
