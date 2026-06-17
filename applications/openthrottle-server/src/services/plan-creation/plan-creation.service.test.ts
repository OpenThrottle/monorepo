import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getDefaultPlanRunConfigStorage,
  PlanEmbeddingsService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import type { Plan } from '@openthrottle/nestjs-repositories';
import { embedQuery } from '@openthrottle/ai-mcp/src/cortex-server';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';
import { PlanCreationService } from './plan-creation.service';

vi.mock('@openthrottle/ai-mcp/src/cortex-server', async (importOriginal) => {
  const mod =
    await importOriginal<
      typeof import('@openthrottle/ai-mcp/src/cortex-server')
    >();
  return {
    ...mod,
    embedQuery: vi.fn(),
  };
});

describe('PlanCreationService', () => {
  let service: PlanCreationService;
  const planRepo = {
    create: vi.fn(),
    manager: {
      transaction: vi.fn(
        (run: (manager: { getRepository: () => unknown }) => unknown) =>
          run({ getRepository: () => planRepo }),
      ),
    },
    save: vi.fn(),
  };
  const embedRepo = {
    create: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(embedQuery).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanCreationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PlansService,
          useValue: {
            getRepository: () => planRepo,
          },
        },
        {
          provide: PlanEmbeddingsService,
          useValue: {
            getRepository: () => embedRepo,
          },
        },
      ],
    }).compile();

    service = module.get<PlanCreationService>(PlanCreationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when title is empty', async () => {
    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: '   ',
    };

    await expect(service.createPlanFromInput(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when category is empty', async () => {
    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: ' ',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'T',
    };

    await expect(service.createPlanFromInput(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when author empty and GITHUB_USER unset', async () => {
    const prev = process.env.GITHUB_USER;
    delete process.env.GITHUB_USER;
    const input: CreatePlanInput = {
      assignee: null,
      author: '  ',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'My plan',
    };

    try {
      await expect(service.createPlanFromInput(input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    } finally {
      if (prev !== undefined) {
        process.env.GITHUB_USER = prev;
      } else {
        delete process.env.GITHUB_USER;
      }
    }
  });

  it('uses GITHUB_USER when author omitted', async () => {
    const prev = process.env.GITHUB_USER;
    process.env.GITHUB_USER = 'fromenv';

    const saved = {
      assignee: null,
      author: 'fromenv',
      category: 'feature',
      createdAt: new Date(),
      description: null,
      id: 'p1',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'My plan',
      updatedAt: new Date(),
    } as Plan;

    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);

    const input: CreatePlanInput = {
      assignee: null,
      author: '',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'My plan',
    };

    try {
      const result = await service.createPlanFromInput(input);

      expect(result.author).toBe('fromenv');
      expect(planRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'fromenv', title: 'My plan' }),
      );
    } finally {
      if (prev !== undefined) {
        process.env.GITHUB_USER = prev;
      } else {
        delete process.env.GITHUB_USER;
      }
    }
  });

  it('persists default runConfig when runConfigJson is omitted', async () => {
    const saved = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      createdAt: new Date(),
      description: null,
      id: 'p-run-config',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(),
    } as Plan;

    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);

    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      runConfigJson: null,
      status: null,
      summary: null,
      title: 'Plan',
    };

    await service.createPlanFromInput(input);

    expect(planRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runConfig: getDefaultPlanRunConfigStorage(),
      }),
    );
  });

  it('stores null assignee when input is not a valid GitHub login', async () => {
    const saved = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      createdAt: new Date(),
      description: null,
      id: 'p2',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(),
    } as Plan;

    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);

    const input: CreatePlanInput = {
      assignee: 'not-a-github!!!',
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'Plan',
    };

    await service.createPlanFromInput(input);

    expect(planRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: null }),
    );
  });

  describe('createPlansFromInput', () => {
    const validInput = (title: string): CreatePlanInput => ({
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      runConfigJson: null,
      status: null,
      summary: null,
      title,
    });

    it('returns empty without a transaction when no inputs are given', async () => {
      const result = await service.createPlansFromInput([]);

      expect(result).toEqual([]);
      expect(planRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('creates every plan in one transaction with a single batched save', async () => {
      planRepo.create.mockImplementation((fields: unknown) => fields);
      planRepo.save.mockImplementation((entities: unknown) =>
        Promise.resolve(entities),
      );

      const result = await service.createPlansFromInput([
        validInput('A'),
        validInput('B'),
      ]);

      expect(planRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(planRepo.save).toHaveBeenCalledTimes(1);
      expect(result.map((plan) => plan.title)).toEqual(['A', 'B']);
    });

    it('throws before opening a transaction when any input is invalid', async () => {
      await expect(
        service.createPlansFromInput([validInput('ok'), validInput('   ')]),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(planRepo.manager.transaction).not.toHaveBeenCalled();
      expect(planRepo.save).not.toHaveBeenCalled();
    });
  });

  it('persists embedding when embedQuery returns a vector', async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);

    const saved = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      createdAt: new Date(),
      description: 'd',
      id: 'p3',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(),
    } as Plan;

    const embeddingRow = { content: 'x', id: 'e1' };
    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);
    embedRepo.create.mockReturnValue(embeddingRow);
    embedRepo.save.mockResolvedValue(embeddingRow);

    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: 'd',
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'Plan',
    };

    await service.createPlanFromInput(input);

    expect(embedQuery).toHaveBeenCalled();
    expect(embedRepo.save).toHaveBeenCalledWith(embeddingRow);
  });
});
